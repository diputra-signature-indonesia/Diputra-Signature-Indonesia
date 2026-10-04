import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Intentionally destructive, LOCAL ONLY. No linked/project/db-url arguments
// are accepted; connection details come from the local stack.
if (process.argv.length !== 2) {
  throw new Error('This command accepts no connection or project overrides.');
}
const cli = resolve('node_modules/supabase/dist/supabase.js');
const run = (...args) => execFileSync(process.execPath, [cli, ...args], { stdio: 'inherit' });

run('db', 'reset', '--local', '--no-seed');
const projectId = readFileSync('supabase/config.toml', 'utf8').match(/^project_id\s*=\s*"([a-zA-Z0-9_-]+)"/m)?.[1];
if (!projectId) throw new Error('Cannot resolve the local Supabase container.');
const seedSql = readdirSync('supabase/seeds')
  .filter((name) => name.endsWith('.sql'))
  .sort()
  .map((name) => readFileSync(resolve('supabase/seeds', name), 'utf8'))
  .join('\n');
execFileSync('docker', ['exec', '-i', 'supabase_db_' + projectId, 'psql', '-U', 'postgres', '-d', 'postgres', '--set', 'ON_ERROR_STOP=1'], {
  input: 'BEGIN;\n' + seedSql + '\nCOMMIT;\n',
  stdio: ['pipe', 'inherit', 'inherit'],
});
execFileSync(process.execPath, [resolve('scripts/bootstrap-local-auth.mjs')], {
  stdio: 'inherit',
});
