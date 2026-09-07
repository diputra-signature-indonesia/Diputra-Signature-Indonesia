import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_TEST_URL;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY;
const secretKey = process.env.SUPABASE_TEST_SECRET_KEY;

if (!url || !anonKey || !secretKey) {
  throw new Error('SUPABASE_TEST_URL, SUPABASE_TEST_ANON_KEY, and SUPABASE_TEST_SECRET_KEY are required.');
}

const clientOptions = {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
};

const anonymous = createClient(url, anonKey, clientOptions);
const trustedServer = createClient(url, secretKey, clientOptions);
const marker = `DB-D HTTP ${Date.now()} ${crypto.randomUUID()}`;

const validContact = {
  name: marker,
  email: 'db-d-http@example.test',
  phone: '+62 812 3456 7890',
  message: 'Temporary DB-D contact HTTP verification.',
  status: 'new',
};

try {
  const { error: anonymousError } = await anonymous.from('contact_messages').insert(validContact);
  if (!anonymousError) throw new Error('anonymous REST insert unexpectedly succeeded');

  const { error: trustedError } = await trustedServer.from('contact_messages').insert(validContact);
  if (trustedError) throw trustedError;

  const { error: invalidError } = await trustedServer.from('contact_messages').insert({
    ...validContact,
    name: `${marker} invalid`,
    email: 'invalid-email',
  });
  if (!invalidError) throw new Error('invalid trusted insert unexpectedly bypassed database constraints');

  console.log('DB-D contact HTTP checks passed: direct anon denied, trusted server allowed, and invalid input rejected.');
} finally {
  await trustedServer.from('contact_messages').delete().like('name', `${marker}%`);
}
