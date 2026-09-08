import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const LOCAL_PASSWORD = 'DiputraLocalOnly!2026';
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

const accounts = [
  { email: 'super-admin-active@example.test', role: 'super_admin', isActive: true },
  { email: 'super-admin-inactive@example.test', role: 'super_admin', isActive: false },
  { email: 'admin-active@example.test', role: 'admin', isActive: true },
  { email: 'admin-inactive@example.test', role: 'admin', isActive: false },
  { email: 'staff-active@example.test', role: 'staff', isActive: true },
  { email: 'staff-inactive@example.test', role: 'staff', isActive: false },
  { email: 'authenticated-no-profile@example.test', role: null, isActive: false },
];

const teamAssignments = [
  { email: 'super-admin-active@example.test', teamMemberId: 'a4994681-e61f-4027-bea5-fae1378fb460' },
  { email: 'admin-active@example.test', teamMemberId: '59f61be2-752b-4254-9bac-6c7438bbc682' },
  { email: 'staff-active@example.test', teamMemberId: '4d3f8bd3-54a3-4810-9118-b70c55c54f42' },
];

function parseSupabaseStatus(output) {
  return Object.fromEntries(
    output
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Z0-9_]+)="(.*)"$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2]])
  );
}

function readLocalSupabaseStatus() {
  const cli = resolve('node_modules', 'supabase', 'dist', 'supabase.js');
  const output = execFileSync(process.execPath, [cli, 'status', '-o', 'env'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      SUPABASE_TELEMETRY_DISABLED: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return parseSupabaseStatus(output);
}

async function listAllUsers(supabase) {
  const users = [];

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;

    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}

async function ensureAuthUser(supabase, existingUsers, account) {
  const existing = existingUsers.find((user) => user.email?.toLowerCase() === account.email);

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      email: account.email,
      password: LOCAL_PASSWORD,
      email_confirm: true,
      user_metadata: { local_fixture: true },
    });

    if (error || !data.user) throw error ?? new Error(`Unable to update ${account.email}.`);
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: account.email,
    password: LOCAL_PASSWORD,
    email_confirm: true,
    user_metadata: { local_fixture: true },
  });

  if (error || !data.user) throw error ?? new Error(`Unable to create ${account.email}.`);
  existingUsers.push(data.user);
  return data.user;
}

async function main() {
  const status = readLocalSupabaseStatus();
  const supabaseUrl = process.env.SUPABASE_TEST_URL || status.API_URL;
  const secretKey = process.env.SUPABASE_TEST_SECRET_KEY || status.SECRET_KEY || status.SERVICE_ROLE_KEY;
  const publicKey = process.env.SUPABASE_TEST_ANON_KEY || status.PUBLISHABLE_KEY || status.ANON_KEY;

  if (!supabaseUrl || !secretKey || !publicKey) {
    throw new Error('Local Supabase URL or API keys are unavailable. Run `supabase start` first.');
  }

  const parsedUrl = new URL(supabaseUrl);
  if (!LOCAL_HOSTS.has(parsedUrl.hostname)) {
    throw new Error(`Refusing to bootstrap Auth against non-local host: ${parsedUrl.hostname}`);
  }

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  const existingUsers = await listAllUsers(supabase);
  const usersByEmail = new Map();

  for (const account of accounts) {
    const user = await ensureAuthUser(supabase, existingUsers, account);
    usersByEmail.set(account.email, user);

    if (account.role) {
      const { error } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          email: account.email,
          role: account.role,
          is_active: account.isActive,
        },
        { onConflict: 'id' }
      );

      if (error) throw error;
    } else {
      const { error } = await supabase.from('profiles').delete().eq('id', user.id);
      if (error) throw error;
    }
  }

  for (const assignment of teamAssignments) {
    const user = usersByEmail.get(assignment.email);
    if (!user) throw new Error(`Missing local Auth fixture ${assignment.email}.`);

    const { error } = await supabase.from('team_members').update({ profile_id: user.id }).eq('id', assignment.teamMemberId);
    if (error) throw error;
  }

  const authClient = createClient(supabaseUrl, publicKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  const { error: signInError } = await authClient.auth.signInWithPassword({
    email: 'staff-active@example.test',
    password: LOCAL_PASSWORD,
  });
  if (signInError) throw new Error(`Fixture login verification failed: ${signInError.message}`);
  await authClient.auth.signOut();

  console.log(`Local Auth bootstrap complete: ${accounts.length} users.`);
  console.log(`Local-only password for every fixture account: ${LOCAL_PASSWORD}`);
}

main().catch((error) => {
  console.error('Local Auth bootstrap failed:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
