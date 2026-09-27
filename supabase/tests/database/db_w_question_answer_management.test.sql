begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(14);

insert into auth.users(id,aud,role,email,created_at,updated_at)
values
  ('9c000000-0000-4000-8000-000000000001','authenticated','authenticated','qna-super@example.test',now(),now()),
  ('9c000000-0000-4000-8000-000000000002','authenticated','authenticated','qna-admin@example.test',now(),now()),
  ('9c000000-0000-4000-8000-000000000003','authenticated','authenticated','qna-staff@example.test',now(),now());

insert into public.profiles(id,email,display_name,role,is_active)
values
  ('9c000000-0000-4000-8000-000000000001','qna-super@example.test','QNA Super','super_admin',true),
  ('9c000000-0000-4000-8000-000000000002','qna-admin@example.test','QNA Admin','admin',true),
  ('9c000000-0000-4000-8000-000000000003','qna-staff@example.test','QNA Staff','staff',true);

insert into public.services_categories(id,slug,title,type,sort_order,is_published)
values('9d000000-0000-4000-8000-000000000001','qna-test-service','QNA Test Service','primary',999,false);

select extensions.has_column('public','question_answer','sort_order','Q&A has per-scope display order');
select extensions.has_function('public','save_question_answer',array['uuid','integer','text','text','uuid','boolean','bigint'],'Q&A save RPC exists');
select extensions.has_function('public','reorder_question_answers',array['uuid','uuid[]'],'Q&A reorder RPC exists');
select extensions.is((select count(*)::integer from public.question_answer where services_categories_id is null and id::text like 'fa000000-%'),10,'ten former static Q&A entries are migrated as Global content');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','9c000000-0000-4000-8000-000000000001',true);
select extensions.ok(
  set_config('test.qna_super_id',public.save_question_answer(null,null,'Super question','Super answer','9d000000-0000-4000-8000-000000000001',true,1)::text,true) is not null,
  'super admin can create Service Q&A'
);

select set_config('request.jwt.claim.sub','9c000000-0000-4000-8000-000000000002',true);
select extensions.ok(
  set_config('test.qna_admin_id',public.save_question_answer(null,null,'Admin question','Admin answer','9d000000-0000-4000-8000-000000000001',true,2)::text,true) is not null,
  'admin can create Service Q&A'
);

select set_config('request.jwt.claim.sub','9c000000-0000-4000-8000-000000000003',true);
select extensions.ok(
  set_config('test.qna_staff_id',public.save_question_answer(null,null,'Staff question','Staff answer','9d000000-0000-4000-8000-000000000001',true,3)::text,true) is not null,
  'staff can create Service Q&A'
);
select extensions.is((select count(*)::integer from public.list_question_answer_categories() where id='9d000000-0000-4000-8000-000000000001'),1,'staff can select an unpublished Service category for Q&A management');
select extensions.lives_ok(
  $$ select public.reorder_question_answers('9d000000-0000-4000-8000-000000000001',array[current_setting('test.qna_staff_id')::uuid,current_setting('test.qna_super_id')::uuid,current_setting('test.qna_admin_id')::uuid]) $$,
  'staff can drag-order Q&A inside a Service scope'
);
select extensions.is(
  (select array_agg(question order by sort_order) from public.question_answer where services_categories_id='9d000000-0000-4000-8000-000000000001'),
  array['Staff question','Super question','Admin question']::text[],
  'Service Q&A order is stored independently'
);
select extensions.lives_ok(
  $$ select public.save_question_answer(current_setting('test.qna_super_id')::uuid,2,'Super question','Super answer','9d000000-0000-4000-8000-000000000001',false,2) $$,
  'staff can hide Q&A created by another role'
);

set local role anon;
select set_config('request.jwt.claim.role','anon',true);
select set_config('request.jwt.claim.sub','',true);
select extensions.is((select count(*)::integer from public.question_answer where id=current_setting('test.qna_super_id')::uuid),0,'public cannot read hidden Q&A');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','9c000000-0000-4000-8000-000000000003',true);
select extensions.lives_ok(
  $$ select public.delete_question_answer(current_setting('test.qna_admin_id')::uuid,2) $$,
  'staff can delete Q&A created by admin'
);
select extensions.is((select count(*)::integer from public.question_answer where id=current_setting('test.qna_admin_id')::uuid),0,'soft-deleted Q&A is removed from staff management reads');

reset role;
select extensions.finish();
rollback;
