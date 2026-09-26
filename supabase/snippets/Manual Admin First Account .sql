begin;

insert into public.profiles (
  id,
  email,
  role,
  is_active,
  updated_at
)
select
  u.id,
  u.email,
  'super_admin'::public.role,
  true,
  now()
from auth.users as u
where u.id = '7e12d994-14fa-49d8-be1b-43671167cc60'::uuid
  and u.email is not null
on conflict (id) do update
set
  email = excluded.email,
  role = 'super_admin'::public.role,
  is_active = true,
  updated_at = now();

commit;