begin;
create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

-- Self-contained fixtures; the transaction rolls back without touching real data.
insert into auth.users(id,aud,role,email,created_at,updated_at) values
  ('f4100000-0000-4000-8000-000000000001','authenticated','authenticated','category-admin@example.test',now(),now()),
  ('f4100000-0000-4000-8000-000000000002','authenticated','authenticated','category-staff@example.test',now(),now()),
  ('f4100000-0000-4000-8000-000000000003','authenticated','authenticated','category-inactive@example.test',now(),now()),
  ('f4100000-0000-4000-8000-000000000004','authenticated','authenticated','category-super@example.test',now(),now());
insert into public.profiles(id,email,display_name,role,is_active) values
  ('f4100000-0000-4000-8000-000000000001','category-admin@example.test','Category Admin','admin',true),
  ('f4100000-0000-4000-8000-000000000002','category-staff@example.test','Category Staff','staff',true),
  ('f4100000-0000-4000-8000-000000000003','category-inactive@example.test','Category Inactive','admin',false),
  ('f4100000-0000-4000-8000-000000000004','category-super@example.test','Category Super','super_admin',true);
insert into public.clients(id,client_type,name,created_by,updated_by) values
  ('f4200000-0000-4000-8000-000000000001','COMPANY','Category Test Client','f4100000-0000-4000-8000-000000000001','f4100000-0000-4000-8000-000000000001');

select extensions.has_table('public','internal_service_categories','dedicated internal category table exists');
select extensions.col_is_fk('public','internal_services','category_id','service category uses a foreign key');
select extensions.is((select confrelid::regclass::text from pg_constraint where conrelid='public.internal_services'::regclass and conname='internal_services_category_id_fkey'),'internal_service_categories','internal FK does not reference client catalogue');
select extensions.ok(not has_table_privilege('anon','public.internal_service_categories','SELECT'),'anonymous has no category SELECT grant');
select extensions.ok(not has_table_privilege('authenticated','public.internal_service_categories','INSERT'),'direct category INSERT denied');
select extensions.ok(not has_table_privilege('authenticated','public.internal_service_categories','UPDATE'),'direct category UPDATE denied');
select extensions.ok(not has_table_privilege('authenticated','public.internal_service_categories','DELETE'),'direct category DELETE denied');
select extensions.ok(not has_table_privilege('authenticated','public.internal_service_categories','TRUNCATE'),'direct category TRUNCATE denied');
select extensions.ok(not has_function_privilege('anon','public.remove_internal_service(uuid,integer)','EXECUTE'),'anonymous removal RPC denied');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','f4100000-0000-4000-8000-000000000001',true);
select set_config('test.cat_company',public.save_internal_service_category(null,null,'company','Category Test Company')::text,true);
select set_config('test.cat_visa',public.save_internal_service_category(null,null,'visa','Category Test Visa')::text,true);
select set_config('test.cat_unused',public.save_internal_service_category(null,null,'UNUSED','Category Test Unused')::text,true);
select extensions.is((select code from public.internal_service_categories where id=current_setting('test.cat_company')::uuid),'COMPANY','category code normalized uppercase');
select extensions.throws_ok($$select public.save_internal_service_category(null,null,'INVALID__CODE','Invalid')$$,'22023',null,'invalid category prefix rejected');
select extensions.throws_ok($$select public.save_internal_service_category(null,null,repeat('A',31),'Too long')$$,'22023',null,'prefix max 30 enforced');
select extensions.throws_ok($$select public.save_internal_service_category(null,null,'OTHER','category test company')$$,'23505',null,'category name is unique case-insensitively');
select extensions.throws_ok($$select public.save_internal_service_category(null,null,'COMPANY','Different name')$$,'23505',null,'category prefix must be unique');
select extensions.lives_ok($$select public.save_internal_service_category(current_setting('test.cat_unused')::uuid,1,'UNUSED_CHANGED','Category Test Unused changed')$$,'unused category can change name and prefix');
select extensions.throws_ok($$select public.save_internal_service_category(current_setting('test.cat_unused')::uuid,1,'OTHER','Stale')$$,'40001','Stale category version.','stale category edit rejected');
select extensions.throws_ok($$select public.delete_internal_service_category(current_setting('test.cat_unused')::uuid,1)$$,'40001','Stale category version.','stale category removal rejected');
select extensions.lives_ok($$select public.delete_internal_service_category(current_setting('test.cat_unused')::uuid,2)$$,'unused category hard deleted');
select extensions.is((select count(*)::integer from public.internal_service_categories where id=current_setting('test.cat_unused')::uuid),0,'unused category physically removed');

select extensions.throws_ok($$select public.save_categorized_internal_service(null,null,null,'SETUP','No category')$$,'22023','Select an internal service category.','new services require category');
select extensions.throws_ok($$select public.save_categorized_internal_service(null,null,'f4900000-0000-4000-8000-000000000001','SETUP','Missing category')$$,'23503',null,'nonexistent category rejected');
select extensions.throws_ok($$select public.save_categorized_internal_service(null,null,current_setting('test.cat_company')::uuid,'BAD__SUFFIX','Invalid suffix')$$,'22023',null,'suffix syntax validated');
select extensions.throws_ok($$select public.save_categorized_internal_service(null,null,current_setting('test.cat_company')::uuid,repeat('A',80),'Long code')$$,'22023','Service code exceeds 80 characters.','combined code max 80 enforced');
select set_config('test.cat_service',public.save_categorized_internal_service(null,null,current_setting('test.cat_company')::uuid,'setup','Category Test Setup')::text,true);
select extensions.is((select code from public.internal_services where id=current_setting('test.cat_service')::uuid),'COMPANY_SETUP','service full code composed automatically');
select extensions.is((select category_id from public.internal_services where id=current_setting('test.cat_service')::uuid),current_setting('test.cat_company')::uuid,'chosen category persisted');
select extensions.throws_ok($$select public.save_categorized_internal_service(null,null,current_setting('test.cat_company')::uuid,'SETUP','Duplicate')$$,'23505',null,'duplicate full service code rejected');
select extensions.throws_ok($$select public.save_internal_service_category(current_setting('test.cat_company')::uuid,1,'COMPANY2','Cannot edit')$$,'23503',null,'used category cannot be edited');
select extensions.throws_ok($$select public.delete_internal_service_category(current_setting('test.cat_company')::uuid,1)$$,'23503',null,'used category cannot be removed');
select extensions.throws_ok($$select public.save_categorized_internal_service(current_setting('test.cat_service')::uuid,1,current_setting('test.cat_company')::uuid,'CHANGED','Changed')$$,'55000','Service code suffix is permanent.','manual suffix immutable on edit');
select extensions.throws_ok($$select public.save_categorized_internal_service(current_setting('test.cat_service')::uuid,1,null,'SETUP','Changed')$$,'22023',null,'categorized service cannot be uncategorized');
select extensions.lives_ok($$select public.save_categorized_internal_service(current_setting('test.cat_service')::uuid,1,current_setting('test.cat_visa')::uuid,'SETUP','Moved service',null,null,false)$$,'service may move category without changing identity');
select extensions.is((select code from public.internal_services where id=current_setting('test.cat_service')::uuid),'VISA_SETUP','prefix follows new category');
select extensions.is((select version from public.internal_services where id=current_setting('test.cat_service')::uuid),2,'categorized save increments version once');
select extensions.throws_ok($$select public.delete_internal_service_category(current_setting('test.cat_visa')::uuid,1)$$,'23503',null,'inactive service still locks its category');
select extensions.throws_ok($$select public.save_internal_service_category(current_setting('test.cat_visa')::uuid,1,'NEW_VISA','Cannot edit inactive')$$,'23503',null,'inactive service also prevents category edit');
select extensions.throws_ok($$select public.remove_internal_service(current_setting('test.cat_service')::uuid,1)$$,'40001','Stale service version.','stale service delete rejected');
select extensions.is(public.remove_internal_service(current_setting('test.cat_service')::uuid,2),'deleted','unused inactive service hard deletes');
select extensions.is((select count(*)::integer from public.internal_services where id=current_setting('test.cat_service')::uuid),0,'unused service physically removed');
select extensions.lives_ok($$select public.delete_internal_service_category(current_setting('test.cat_visa')::uuid,1)$$,'category unlocks after last service removal');

select set_config('test.cat_legacy',public.save_internal_service(null,null,'LEGACY_TEST','Category Legacy')::text,true);
select extensions.lives_ok($$select public.save_categorized_internal_service(current_setting('test.cat_legacy')::uuid,1,null,'LEGACY_TEST','Legacy renamed')$$,'legacy uncategorized service remains editable');
select extensions.is((select code from public.internal_services where id=current_setting('test.cat_legacy')::uuid),'LEGACY_TEST','legacy code unchanged until explicit categorization');
select extensions.lives_ok($$select public.save_categorized_internal_service(current_setting('test.cat_legacy')::uuid,2,current_setting('test.cat_company')::uuid,'LEGACY_TEST','Legacy categorized')$$,'admin explicitly categorizes existing service preserving ID');
select extensions.is((select code from public.internal_services where id=current_setting('test.cat_legacy')::uuid),'COMPANY_LEGACY_TEST','legacy manual suffix preserved under category prefix');
select extensions.is(public.remove_internal_service(current_setting('test.cat_legacy')::uuid,3),'deleted','unused legacy service can hard delete');

select set_config('test.cat_workflow',public.save_workflow_template(null,null,'CATEGORY_TEST_FLOW','Category test workflow',null,'[{"name":"FIRST"}]'::jsonb,true)::text,true);
select set_config('test.cat_used',public.save_categorized_internal_service(null,null,current_setting('test.cat_company')::uuid,'USED','Category Test Used',null,current_setting('test.cat_workflow')::uuid)::text,true);
select set_config('test.cat_job',public.create_job(p_client_id=>'f4200000-0000-4000-8000-000000000001',p_title=>'Category usage test',p_internal_service_id=>current_setting('test.cat_used')::uuid,p_priority_id=>'21000000-0000-4000-8000-000000000001',p_pic_id=>'f4100000-0000-4000-8000-000000000001')::text,true);
select set_config('test.cat_sop',public.save_sop(current_setting('test.cat_used')::uuid,'Category test SOP',null)::text,true);
select extensions.is(public.remove_internal_service(current_setting('test.cat_used')::uuid,1),'deactivated','Job/SOP used service deactivates instead of hard delete');
select extensions.is((select is_active from public.internal_services where id=current_setting('test.cat_used')::uuid),false,'used service becomes inactive');
select extensions.is((select internal_service_id from public.jobs where id=current_setting('test.cat_job')::uuid),current_setting('test.cat_used')::uuid,'Job reference preserved');
select extensions.is((select internal_service_id from public.sops where id=current_setting('test.cat_sop')::uuid),current_setting('test.cat_used')::uuid,'SOP reference preserved');
select extensions.lives_ok($$select public.trash_job(current_setting('test.cat_job')::uuid,1,'Category usage test')$$,'test Job can be archived');
select extensions.is((select job_count from public.list_internal_service_usage() where id=current_setting('test.cat_used')::uuid),1::bigint,'usage includes archived Jobs');
select extensions.is((select sop_count from public.list_internal_service_usage() where id=current_setting('test.cat_used')::uuid),1::bigint,'usage includes SOP references');
select extensions.is(public.remove_internal_service(current_setting('test.cat_used')::uuid,2),'deactivated','archived references continue blocking hard deletion');
select extensions.throws_ok($$select public.delete_internal_service_category(current_setting('test.cat_company')::uuid,1)$$,'23503',null,'category remains locked by historically used inactive service');

-- A SOP alone also prevents removal, even without any Job.
select set_config('test.cat_sop_only_service',public.save_categorized_internal_service(null,null,current_setting('test.cat_company')::uuid,'SOP_ONLY','SOP only service')::text,true);
select public.save_sop(current_setting('test.cat_sop_only_service')::uuid,'SOP only',null);
select extensions.is(public.remove_internal_service(current_setting('test.cat_sop_only_service')::uuid,1),'deactivated','SOP-only service cannot hard delete');

select set_config('request.jwt.claim.sub','f4100000-0000-4000-8000-000000000002',true);
select extensions.is((select count(*)::integer from public.internal_service_categories where id=current_setting('test.cat_company')::uuid),1,'active staff can read internal categories');
select extensions.is((select job_count from public.list_internal_service_usage() where id=current_setting('test.cat_used')::uuid),1::bigint,'staff usage projection includes historical references');
select extensions.throws_ok($$select public.save_internal_service_category(null,null,'STAFF','Denied')$$,'42501','Admin access required.','staff category creation denied');
select extensions.throws_ok($$select public.delete_internal_service_category(current_setting('test.cat_company')::uuid,1)$$,'42501','Admin access required.','staff category deletion denied');
select extensions.throws_ok($$select public.save_categorized_internal_service(null,null,current_setting('test.cat_company')::uuid,'STAFF','Denied')$$,'42501','Admin access required.','staff service creation denied');
select extensions.throws_ok($$select public.remove_internal_service(current_setting('test.cat_used')::uuid,3)$$,'42501','Admin access required.','staff service deletion denied');
select extensions.throws_ok($$update public.internal_service_categories set name='Forged' where id=current_setting('test.cat_company')::uuid$$,'42501',null,'direct table writes denied');

select set_config('request.jwt.claim.sub','f4100000-0000-4000-8000-000000000003',true);
select extensions.is((select count(*)::integer from public.internal_service_categories),0,'inactive admin cannot read categories');
select extensions.throws_ok($$select public.save_internal_service_category(null,null,'INACTIVE','Denied')$$,'42501','Admin access required.','inactive admin cannot manage categories');
select extensions.throws_ok($$select * from public.list_internal_service_usage()$$,'42501','Active staff access required.','inactive admin cannot inspect usage');
select set_config('request.jwt.claim.sub','f4100000-0000-4000-8000-000000000004',true);
select extensions.lives_ok($$select public.save_internal_service_category(null,null,'SUPER','Category super')$$,'super admin can manage categories');
reset role;

select extensions.throws_ok($$update public.internal_services set code='WRONG_PREFIX' where id=current_setting('test.cat_used')::uuid$$,'22023','Service code must use the selected category prefix.','trigger guards categorized code even for privileged writes');
set local role anon;
select extensions.throws_ok($$select * from public.internal_service_categories$$,'42501',null,'anonymous cannot enumerate internal categories');
select extensions.throws_ok($$select public.save_internal_service_category(null,null,'ANON','Denied')$$,'42501',null,'anonymous cannot execute save RPC');
reset role;
select extensions.finish();
rollback;
