begin;
create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

insert into auth.users(id,aud,role,email,created_at,updated_at) values
  ('f5100000-0000-4000-8000-000000000001','authenticated','authenticated','search-admin@example.test',now(),now()),
  ('f5100000-0000-4000-8000-000000000002','authenticated','authenticated','search-staff@example.test',now(),now()),
  ('f5100000-0000-4000-8000-000000000003','authenticated','authenticated','search-inactive@example.test',now(),now());
insert into public.profiles(id,email,display_name,role,is_active) values
  ('f5100000-0000-4000-8000-000000000001','search-admin@example.test','Search Admin','admin',true),
  ('f5100000-0000-4000-8000-000000000002','search-staff@example.test','Search Staff','staff',true),
  ('f5100000-0000-4000-8000-000000000003','search-inactive@example.test','Search Inactive','admin',false);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','f5100000-0000-4000-8000-000000000001',true);
select set_config('test.search_category',public.save_internal_service_category(null,null,'CATSRCH','V21 Category Search Fixture')::text,true);
select set_config('test.search_empty_category',public.save_internal_service_category(null,null,'CATSRCH_EMPTY','V21 Empty Search Fixture')::text,true);
select set_config('test.search_workflow',public.save_workflow_template(null,null,'CATSRCH_FLOW','V21 Search Flow',null,'[{"name":"FIRST"}]'::jsonb,true)::text,true);
reset role;

-- More than max_rows=1000. No dummy rows survive the rolled-back transaction.
insert into public.internal_services(code,name,summary,category_id,workflow_template_id,is_active)
select 'CATSRCH_ITEM_'||lpad(i::text,4,'0'),'V21 SEARCH FIXTURE #'||lpad(i::text,4,'0'),
  case when i=70 then 'Extension renewal help' else null end,
  current_setting('test.search_category')::uuid,current_setting('test.search_workflow')::uuid,i%2=0
from generate_series(1,1075) i;
insert into public.internal_services(code,name) values
  ('V21_SEARCH_LEGACY','V21 Search Legacy'),('V21_SEARCH_LITERAL','V21%Search_fixture');

set local role authenticated;
select set_config('request.jwt.claim.sub','f5100000-0000-4000-8000-000000000002',true);
select set_config('test.search_result',public.search_internal_services('',current_setting('test.search_category')::uuid,false,1)::text,true);
select extensions.is((current_setting('test.search_result')::jsonb->>'total')::integer,1075,'total count spans all matching records, beyond API max_rows');
select extensions.is(jsonb_array_length(current_setting('test.search_result')::jsonb->'rows'),10,'only ten rows are returned');
select extensions.is(current_setting('test.search_result')::jsonb->'rows'->0->>'code','CATSRCH_ITEM_0001','stable first page ordering');
select extensions.is((current_setting('test.search_result')::jsonb->>'page_count')::integer,108,'page count covers full database result');
select extensions.is(current_setting('test.search_result')::jsonb->'rows'->0->>'category_name','V21 Category Search Fixture','page includes category metadata');
select extensions.is(current_setting('test.search_result')::jsonb->'rows'->0->>'workflow_name','V21 Search Flow','page includes workflow metadata');
select extensions.is((current_setting('test.search_result')::jsonb->'rows'->0->>'step_count')::integer,1,'workflow steps are projected only for page rows');
select extensions.is((current_setting('test.search_result')::jsonb->'rows'->0->>'reference_count')::integer,0,'usage metadata accompanies the page');
select extensions.is((current_setting('test.search_result')::jsonb->'rows'->0->>'is_active')::boolean,false,'inactive service remains searchable');
select extensions.is(public.search_internal_services('',current_setting('test.search_category')::uuid,false,7)->'rows'->9->>'code','CATSRCH_ITEM_0070','page seven fetches service seventy directly');
select extensions.is(public.search_internal_services('',current_setting('test.search_category')::uuid,false,107)->'rows'->9->>'code','CATSRCH_ITEM_1070','pagination fetches records beyond the first 1000');
select extensions.is((public.search_internal_services('',current_setting('test.search_category')::uuid,false,999)->>'page')::integer,108,'out-of-range page clamps after deletion/filter change');
select extensions.is(jsonb_array_length(public.search_internal_services('',current_setting('test.search_category')::uuid,false,999)->'rows'),5,'last page has remaining five rows');
select extensions.is(public.search_internal_services('CATSRCH_ITEM_1070')->'rows'->0->>'code','CATSRCH_ITEM_1070','server search finds a code beyond the first 1000');
select extensions.is(public.search_internal_services('fixture #0070 SEARCH')->'rows'->0->>'code','CATSRCH_ITEM_0070','multi-term case-insensitive search matches service name');
select extensions.is(public.search_internal_services('renewal help')->'rows'->0->>'code','CATSRCH_ITEM_0070','server search matches summary');
select extensions.is((public.search_internal_services('V21 Category Search Fixture')->>'total')::integer,1075,'server search matches category name');
select extensions.is((public.search_internal_services('  FIXTURE   #0070  ')->>'total')::integer,1,'search whitespace normalized');
select extensions.is((public.search_internal_services('V21 SEARCH',null,true,1)->>'total')::integer,2,'uncategorized filter excludes all 1075 categorized services');
select extensions.is((public.search_internal_services('%Search_')->>'total')::integer,1,'percent and underscore are literal characters, not wildcards');
select extensions.is((public.search_internal_services('x''); drop table public.internal_services; --')->>'total')::integer,0,'SQL-looking text is treated as literal search');
select extensions.is((public.search_internal_services('',current_setting('test.search_empty_category')::uuid,false,10)->>'page')::integer,1,'empty result has one valid page');
select extensions.is(jsonb_array_length(public.search_internal_services('',current_setting('test.search_empty_category')::uuid,false,1)->'rows'),0,'empty category returns no rows');
select extensions.is((public.internal_service_catalogue_counts()->'categories'->>current_setting('test.search_category'))::integer,1075,'category usage count is not derived from ten visible rows');
select extensions.is((public.internal_service_catalogue_counts()->'workflows'->>current_setting('test.search_workflow'))::integer,1075,'workflow usage count includes all services');
select extensions.throws_ok($$select public.search_internal_services('',null,false,0)$$,'22023','Internal service search input is invalid.','invalid page rejected');
select extensions.throws_ok($$select public.search_internal_services(repeat('a',161))$$,'22023','Internal service search input is invalid.','oversized search rejected');
select extensions.throws_ok($$select public.search_internal_services('',current_setting('test.search_category')::uuid,true,1)$$,'22023','Internal service search input is invalid.','conflicting category filters rejected');

select set_config('request.jwt.claim.sub','f5100000-0000-4000-8000-000000000003',true);
select extensions.throws_ok($$select public.search_internal_services()$$,'42501','Active staff access required.','inactive admin cannot search');
select extensions.throws_ok($$select public.internal_service_catalogue_counts()$$,'42501','Active staff access required.','inactive admin cannot read counts');
reset role;
select extensions.ok(not has_function_privilege('anon','public.search_internal_services(text,uuid,boolean,integer)','EXECUTE'),'anonymous search RPC denied');
select extensions.ok(not has_function_privilege('anon','public.internal_service_catalogue_counts()','EXECUTE'),'anonymous count RPC denied');
select extensions.finish();
rollback;
