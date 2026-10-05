begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(4);

select extensions.ok(
  not has_table_privilege('anon', 'public.jobs', 'TRUNCATE'),
  'baseline does not inherit local anonymous TRUNCATE access'
);
select extensions.ok(
  not has_table_privilege('authenticated', 'public.jobs', 'TRUNCATE'),
  'baseline does not inherit authenticated TRUNCATE access'
);
select extensions.ok(
  not has_table_privilege('authenticated', 'public.profiles', 'TRIGGER'),
  'baseline preserves the remote restricted profile table grants'
);
select extensions.ok(
  has_table_privilege('authenticated', 'public.jobs', 'SELECT'),
  'baseline preserves intended authenticated SELECT access'
);

select * from extensions.finish();
rollback;
