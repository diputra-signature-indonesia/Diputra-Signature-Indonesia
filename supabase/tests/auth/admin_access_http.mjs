import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_TEST_URL;
const publicKey = process.env.SUPABASE_TEST_ANON_KEY;
const secretKey = process.env.SUPABASE_TEST_SECRET_KEY;
const localHosts = new Set(['127.0.0.1', 'localhost', '::1']);

if (!url || !publicKey || !secretKey) {
  throw new Error('SUPABASE_TEST_URL, SUPABASE_TEST_ANON_KEY, and SUPABASE_TEST_SECRET_KEY are required.');
}

if (!localHosts.has(new URL(url).hostname)) {
  throw new Error(`Refusing to run access approval HTTP tests against non-local host: ${new URL(url).hostname}`);
}

const clientOptions = {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
};

const trustedLocal = createClient(url, secretKey, clientOptions);
const suffix = `${Date.now()}-${crypto.randomUUID()}`;
const password = `Access-${crypto.randomUUID()}aA1!`;
const users = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function createUser(label, metadata = {}) {
  const email = `access-${label}-${suffix}@example.test`;
  const { data, error } = await trustedLocal.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error) throw error;
  users.push(data.user);
  return data.user;
}

async function authenticatedClient(email) {
  const publicClient = createClient(url, publicKey, clientOptions);
  const { data, error } = await publicClient.auth.signInWithPassword({ email, password });
  if (error) throw error;

  return createClient(url, publicKey, {
    ...clientOptions,
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });
}

try {
  const superAdminUser = await createUser('super');
  const pendingUser = await createUser('pending', {
    full_name: 'HTTP Pending User',
    avatar_url: 'https://example.test/http-pending.png',
  });
  const rejectedUser = await createUser('rejected');

  const { error: bootstrapError } = await trustedLocal.from('profiles').insert({
    id: superAdminUser.id,
    email: superAdminUser.email,
    role: 'super_admin',
    is_active: true,
  });
  if (bootstrapError) throw bootstrapError;

  const pending = await authenticatedClient(pendingUser.email);
  const superAdmin = await authenticatedClient(superAdminUser.email);
  const rejected = await authenticatedClient(rejectedUser.email);

  const firstRequest = await pending.rpc('ensure_admin_access_request');
  if (firstRequest.error) throw firstRequest.error;
  assert(firstRequest.data === 'pending', 'new authenticated user did not become pending');

  const repeatedRequest = await pending.rpc('ensure_admin_access_request');
  if (repeatedRequest.error) throw repeatedRequest.error;
  assert(repeatedRequest.data === 'pending', 'repeated request did not remain pending');

  const ownRequest = await pending.from('admin_access_requests').select('user_id, status, full_name').eq('user_id', pendingUser.id).single();
  if (ownRequest.error) throw ownRequest.error;
  assert(ownRequest.data.full_name === 'HTTP Pending User', 'Auth metadata was not copied into the request');

  const privateData = await pending.from('review_requests').select('id');
  if (privateData.error) throw privateData.error;
  assert(privateData.data.length === 0, 'pending user could read admin workflow data');

  const selfApproval = await pending.rpc('approve_admin_access_request', { p_user_id: pendingUser.id, p_role: 'super_admin' });
  assert(selfApproval.error, 'pending user unexpectedly approved itself');

  const directStatusUpdate = await pending.from('admin_access_requests').update({ status: 'approved' }).eq('user_id', pendingUser.id);
  assert(directStatusUpdate.error, 'pending user unexpectedly updated request status directly');

  const visiblePending = await superAdmin.from('admin_access_requests').select('user_id').eq('status', 'pending');
  if (visiblePending.error) throw visiblePending.error;
  assert(visiblePending.data.some((request) => request.user_id === pendingUser.id), 'super admin could not read pending requests');

  const approval = await superAdmin.rpc('approve_admin_access_request', { p_user_id: pendingUser.id, p_role: 'staff' });
  if (approval.error) throw approval.error;

  const approvedProfile = await pending.from('profiles').select('id, role, is_active').eq('id', pendingUser.id).single();
  if (approvedProfile.error) throw approvedProfile.error;
  assert(approvedProfile.data.role === 'staff' && approvedProfile.data.is_active, 'approved profile was not active with the selected role');

  const doubleApproval = await superAdmin.rpc('approve_admin_access_request', { p_user_id: pendingUser.id, p_role: 'admin' });
  assert(doubleApproval.error, 'double approval unexpectedly succeeded');

  const directRoleUpdate = await pending.from('profiles').update({ role: 'super_admin', is_active: true }).eq('id', pendingUser.id);
  assert(directRoleUpdate.error, 'ordinary user unexpectedly changed profile authorization fields');

  const rejectedRequest = await rejected.rpc('ensure_admin_access_request');
  if (rejectedRequest.error) throw rejectedRequest.error;

  const rejection = await superAdmin.rpc('reject_admin_access_request', {
    p_user_id: rejectedUser.id,
    p_rejection_reason: 'HTTP rejection fixture',
  });
  if (rejection.error) throw rejection.error;

  const rejectedProfile = await trustedLocal.from('profiles').select('id').eq('id', rejectedUser.id);
  if (rejectedProfile.error) throw rejectedProfile.error;
  assert(rejectedProfile.data.length === 0, 'rejection unexpectedly created a profile');

  console.log('Admin access HTTP checks passed: pending, RLS denial, super-admin approval, role activation, rejection, and duplicate-review protection.');
} finally {
  for (const user of users.reverse()) {
    await trustedLocal.auth.admin.deleteUser(user.id);
  }
}
