begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(19);

select extensions.is(
  (select count(*)::bigint from auth.users where raw_user_meta_data ->> 'local_fixture' = 'true'),
  7::bigint,
  'seven local-only Auth fixtures exist'
);

select extensions.is(
  (select count(*)::bigint from public.profiles where role = 'super_admin' and is_active),
  1::bigint,
  'one active super admin profile exists'
);

select extensions.is(
  (select count(*)::bigint from public.profiles where role = 'super_admin' and not is_active),
  1::bigint,
  'one inactive super admin profile exists'
);

select extensions.is(
  (select count(*)::bigint from public.profiles where role = 'admin' and is_active),
  1::bigint,
  'one active admin profile exists'
);

select extensions.is(
  (select count(*)::bigint from public.profiles where role = 'admin' and not is_active),
  1::bigint,
  'one inactive admin profile exists'
);

select extensions.is(
  (select count(*)::bigint from public.profiles where role = 'staff' and is_active),
  1::bigint,
  'one active staff profile exists'
);

select extensions.is(
  (select count(*)::bigint from public.profiles where role = 'staff' and not is_active),
  1::bigint,
  'one inactive staff profile exists'
);

select extensions.is(
  (
    select count(*)::bigint
    from auth.users as users
    left join public.profiles as profiles on profiles.id = users.id
    where users.email = 'authenticated-no-profile@example.test'
      and profiles.id is null
  ),
  1::bigint,
  'the authenticated-without-profile fixture has no profile'
);

select extensions.is(
  (select count(*)::bigint from public.team_members where profile_id is not null),
  3::bigint,
  'three active fixture accounts are linked to team members'
);

select extensions.is(
  (select count(*)::bigint from public.blog_posts where slug like 'local-%-guide'),
  4::bigint,
  'four local blog workflow fixtures exist'
);

select extensions.results_eq(
  $$
    select status::text
    from public.blog_posts
    where slug like 'local-%-guide'
    order by status::text
  $$,
  $$ values ('draft'::text), ('pending'::text), ('published'::text), ('rejected'::text) $$,
  'all blog workflow statuses are represented'
);

select extensions.is(
  (select count(*)::bigint from public.review_requests where client_email like '%@example.test'),
  4::bigint,
  'four local review request fixtures exist'
);

select extensions.is(
  public.check_review_request_status(repeat('e', 64)),
  'valid',
  'the documented valid local review token is usable'
);

select extensions.is(
  public.check_review_request_status(repeat('f', 64)),
  'expired',
  'the documented expired local review token is expired'
);

select extensions.is(
  public.check_review_request_status(repeat('0', 64)),
  'used',
  'the documented used local review token is used'
);

select extensions.is(
  public.check_review_request_status(repeat('2', 64)),
  'invalid',
  'the documented revoked local review token is not disclosed'
);

select extensions.is(
  (select count(*)::bigint from public.reviews where email like '%@example.test'),
  3::bigint,
  'three local review visibility fixtures exist'
);

select extensions.is(
  (select count(distinct status)::bigint from public.contact_messages where email like '%@example.test'),
  5::bigint,
  'all contact workflow statuses are represented'
);

select extensions.is(
  (
    select count(*)::bigint
    from public.team_members
    where avatar_url like 'https://%.supabase.co/%'
  ),
  0::bigint,
  'team fixtures do not depend on Production Storage URLs'
);

select * from extensions.finish();

rollback;
