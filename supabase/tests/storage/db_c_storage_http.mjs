import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_TEST_URL;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceRoleKey) {
  throw new Error('SUPABASE_TEST_URL, SUPABASE_TEST_ANON_KEY, and SUPABASE_TEST_SERVICE_ROLE_KEY are required.');
}

const clientOptions = {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
};

const admin = createClient(url, serviceRoleKey, clientOptions);
const anonymous = createClient(url, anonKey, clientOptions);

const suffix = `${Date.now()}-${crypto.randomUUID()}`;
const email = `db-c-http-${suffix}@example.test`;
const password = `Db-C-${crypto.randomUUID()}aA1!`;
const validPath = `blog/${crypto.randomUUID()}.png`;
const invalidMimePath = `blog/${crypto.randomUUID()}.png`;
const oversizedPath = `blog_cover/${crypto.randomUUID()}.png`;
const cleanupPaths = new Set([validPath, invalidMimePath, oversizedPath]);

let userId;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) throw createError;

  userId = created.user.id;

  const { error: profileError } = await admin.from('profiles').insert({
    id: userId,
    email,
    role: 'staff',
    is_active: true,
  });
  if (profileError) throw profileError;

  const { data: signedIn, error: signInError } = await anonymous.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  const staff = createClient(url, anonKey, {
    ...clientOptions,
    global: {
      headers: {
        Authorization: `Bearer ${signedIn.session.access_token}`,
      },
    },
  });

  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZrNwAAAAASUVORK5CYII=', 'base64');

  const { error: uploadError } = await staff.storage.from('images').upload(validPath, png, {
    cacheControl: '31536000',
    contentType: 'image/png',
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { error: overwriteError } = await staff.storage.from('images').upload(validPath, png, {
    cacheControl: '31536000',
    contentType: 'image/png',
    upsert: false,
  });
  assert(overwriteError, 'upsert:false must reject overwriting an existing path');

  const { error: mimeError } = await staff.storage.from('images').upload(invalidMimePath, Buffer.from('not-an-image'), {
    cacheControl: '31536000',
    contentType: 'text/plain',
    upsert: false,
  });
  assert(mimeError, 'bucket must reject a MIME type outside JPEG, PNG, and WebP');

  const { error: sizeError } = await staff.storage.from('images').upload(oversizedPath, Buffer.alloc(5 * 1024 * 1024 + 1), {
    cacheControl: '31536000',
    contentType: 'image/png',
    upsert: false,
  });
  assert(sizeError, 'bucket must reject files larger than 5 MiB');

  const { data: publicUrlData } = staff.storage.from('images').getPublicUrl(validPath);
  const response = await fetch(publicUrlData.publicUrl);
  assert(response.ok, `public image request failed with HTTP ${response.status}`);

  const cacheControl = response.headers.get('cache-control') ?? '';
  assert(cacheControl.includes('max-age=31536000'), `unexpected public cache-control header: ${cacheControl || '<missing>'}`);

  const { error: removeError } = await staff.storage.from('images').remove([validPath]);
  if (removeError) throw removeError;
  cleanupPaths.delete(validPath);

  console.log('DB-C Storage HTTP checks passed: upload, immutable path, MIME, size, public read, one-year cache, and staff cleanup.');
} finally {
  if (cleanupPaths.size > 0) {
    await admin.storage.from('images').remove([...cleanupPaths]);
  }

  if (userId) {
    await admin.from('profiles').delete().eq('id', userId);
    await admin.auth.admin.deleteUser(userId);
  }
}
