begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(14);

select extensions.is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'contact_messages'
      and cmd = 'INSERT'
  ),
  0::bigint,
  'contact messages have no direct insert policy'
);

select extensions.ok(
  not has_table_privilege('anon', 'public.contact_messages', 'INSERT'),
  'anon insert privilege is revoked'
);

select extensions.ok(
  not has_table_privilege('authenticated', 'public.contact_messages', 'INSERT'),
  'authenticated insert privilege is revoked'
);

select extensions.ok(
  has_table_privilege('service_role', 'public.contact_messages', 'INSERT'),
  'trusted service role retains insert privilege'
);

select extensions.is(
  (
    select count(*)::bigint
    from pg_constraint
    where conrelid = 'public.contact_messages'::regclass
      and conname in (
        'contact_messages_name_contract',
        'contact_messages_email_contract',
        'contact_messages_phone_contract',
        'contact_messages_message_contract'
      )
  ),
  4::bigint,
  'all four contact input constraints exist'
);

select extensions.is(
  (
    select count(*)::bigint
    from pg_constraint
    where conrelid = 'public.contact_messages'::regclass
      and conname like 'contact_messages_%_contract'
      and convalidated = false
  ),
  4::bigint,
  'contact constraints remain NOT VALID until legacy data is audited'
);

set local role anon;

select extensions.throws_ok(
  $$
    insert into public.contact_messages (name, email, phone, message)
    values ('Anonymous User', 'anon@example.test', '+62 812 3456 7890', 'Valid anonymous message')
  $$,
  '42501',
  null,
  'anon cannot insert contact messages directly'
);

set local role authenticated;

select extensions.throws_ok(
  $$
    insert into public.contact_messages (name, email, phone, message)
    values ('Authenticated User', 'auth@example.test', '+62 812 3456 7890', 'Valid authenticated message')
  $$,
  '42501',
  null,
  'authenticated cannot insert contact messages directly'
);

set local role service_role;

select extensions.lives_ok(
  $$
    insert into public.contact_messages (id, name, email, phone, message, status)
    values (
      '80000000-0000-4000-8000-000000000401',
      'Trusted Server',
      'trusted@example.test',
      '+62 812 3456 7890',
      'Valid trusted server contact message',
      'new'
    )
  $$,
  'trusted server can insert a valid contact message'
);

select extensions.is(
  (
    select count(*)::bigint
    from public.contact_messages
    where id = '80000000-0000-4000-8000-000000000401'
  ),
  1::bigint,
  'valid trusted contact row is stored'
);

select extensions.throws_ok(
  $$
    insert into public.contact_messages (name, email, phone, message)
    values ('A', 'name@example.test', '+62 812 3456 7890', 'Message with a name that is too short')
  $$,
  '23514',
  null,
  'database rejects an invalid name'
);

select extensions.throws_ok(
  $$
    insert into public.contact_messages (name, email, phone, message)
    values ('Valid Name', 'invalid-email', '+62 812 3456 7890', 'Message with an invalid email address')
  $$,
  '23514',
  null,
  'database rejects an invalid email'
);

select extensions.throws_ok(
  $$
    insert into public.contact_messages (name, email, phone, message)
    values ('Valid Name', 'name@example.test', 'call-me', 'Message with an invalid phone number')
  $$,
  '23514',
  null,
  'database rejects an invalid phone number'
);

select extensions.throws_ok(
  $$
    insert into public.contact_messages (name, email, phone, message)
    values ('Valid Name', 'name@example.test', '+62 812 3456 7890', 'short')
  $$,
  '23514',
  null,
  'database rejects a message that is too short'
);

reset role;

select extensions.finish();

rollback;
