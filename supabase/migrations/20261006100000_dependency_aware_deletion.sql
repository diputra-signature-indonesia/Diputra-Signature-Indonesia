begin;

-- Incremental V2.1 change. No existing business data is deleted by this migration.
alter table public.internal_service_categories add column is_active boolean not null default true;
alter table public.jobs add column deletion_token uuid, add column deletion_started_at timestamptz;
alter table public.internal_services add column deletion_token uuid, add column deletion_started_at timestamptz;
alter table public.jobs add constraint jobs_deletion_state check ((deletion_token is null) = (deletion_started_at is null));
alter table public.internal_services add constraint internal_services_deletion_state check ((deletion_token is null) = (deletion_started_at is null));

-- Counts include inactive, hidden, archived and replaced references. Owned SOPs
-- and template steps are not external references; they are cleaned up together.
create function private.master_reference_counts(p_kind text,p_ids uuid[])
returns table(id uuid,reference_count bigint) language sql stable set search_path='' as $$
  with refs as (
    select category_id as id from public.internal_services where p_kind='internal-service-categories' and category_id=any(p_ids)
    union all select internal_service_id from public.jobs where p_kind='internal-services' and internal_service_id=any(p_ids)
    union all select priority_id from public.jobs where p_kind='priorities' and priority_id=any(p_ids)
    union all select priority_id from public.tasks where p_kind='priorities' and priority_id=any(p_ids)
    union all select status_id from public.jobs where p_kind='job-statuses' and status_id=any(p_ids)
    union all select task_status_id from public.job_task_statuses where p_kind='task-statuses' and task_status_id=any(p_ids)
    union all select job_title_id from public.team_members where p_kind='job-titles' and job_title_id=any(p_ids)
    union all select workflow_template_id from public.internal_services where p_kind='workflow-templates' and workflow_template_id=any(p_ids)
    union all select workflow_template_id from public.jobs where p_kind='workflow-templates' and workflow_template_id=any(p_ids)
    union all select st.workflow_template_id from public.job_steps j join public.workflow_template_steps st on st.id=j.template_step_id
      where p_kind='workflow-templates' and st.workflow_template_id=any(p_ids)
  ) select targets.id,count(refs.id) from unnest(p_ids) targets(id) left join refs on refs.id=targets.id group by targets.id;
$$;

create function public.remove_master_data(p_kind text,p_id uuid,p_expected_version integer)
returns text language plpgsql security definer set search_path='' as $$
declare v_table text;v_row jsonb;v_count bigint;
begin
  if not private.is_active_admin(auth.uid()) then raise exception 'Admin access required.' using errcode='42501'; end if;
  v_table:=case p_kind when 'priorities' then 'priorities' when 'job-statuses' then 'job_statuses'
    when 'task-statuses' then 'task_statuses' when 'job-titles' then 'job_titles'
    when 'internal-service-categories' then 'internal_service_categories' when 'workflow-templates' then 'workflow_templates' end;
  if v_table is null then raise exception 'Invalid master category.' using errcode='22023'; end if;
  execute format('select to_jsonb(t) from public.%I t where id=$1 for update',v_table) into v_row using p_id;
  if v_row is null then raise exception 'Master data not found.' using errcode='P0002'; end if;
  if p_expected_version is null or (v_row->>'version')::integer<>p_expected_version then raise exception 'Stale master data version.' using errcode='40001'; end if;
  if coalesce((v_row->>'is_system')::boolean,false) then raise exception 'System data must remain active.' using errcode='55000'; end if;
  select reference_count into v_count from private.master_reference_counts(p_kind,array[p_id]);
  if v_count>0 then
    execute format('update public.%I set is_active=false,updated_by=$2,version=version+1 where id=$1',v_table) using p_id,auth.uid();
    return 'deactivated';
  end if;
  if p_kind='workflow-templates' then delete from public.workflow_template_steps where workflow_template_id=p_id; end if;
  execute format('delete from public.%I where id=$1',v_table) using p_id;
  return 'deleted';
end;
$$;

-- Keep legacy category removal safe during a rolling deployment.
create or replace function public.delete_internal_service_category(p_id uuid,p_expected_version integer)
returns void language plpgsql security definer set search_path='' as $$
begin perform public.remove_master_data('internal-service-categories',p_id,p_expected_version); end;
$$;

-- Used category names/prefixes remain locked, but availability can be changed.
create function public.save_internal_service_category_state(p_id uuid,p_expected_version integer,p_code text,p_name text,p_is_active boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_row public.internal_service_categories%rowtype;v_id uuid;
begin
  if not private.is_active_admin(auth.uid()) then raise exception 'Admin access required.' using errcode='42501'; end if;
  if p_is_active is null then raise exception 'Invalid availability.' using errcode='22023'; end if;
  if p_id is not null then
    select * into v_row from public.internal_service_categories where id=p_id for update;
    if not found then raise exception 'Category not found.' using errcode='P0002'; end if;
    if p_expected_version is null or v_row.version<>p_expected_version then raise exception 'Stale category version.' using errcode='40001'; end if;
    if exists(select 1 from public.internal_services where category_id=p_id) then
      if upper(btrim(p_code))<>v_row.code or btrim(p_name)<>v_row.name then raise exception 'Category is used; name and prefix are locked.' using errcode='23503'; end if;
      update public.internal_service_categories set is_active=p_is_active,updated_by=auth.uid(),updated_at=now(),version=version+1 where id=p_id;
      return p_id;
    end if;
  end if;
  v_id:=public.save_internal_service_category(p_id,p_expected_version,p_code,p_name);
  update public.internal_service_categories set is_active=p_is_active where id=v_id;
  return v_id;
end;
$$;

create or replace function private.validate_internal_service_category()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_prefix text;v_active boolean;
begin
  if new.category_id is not null then
    select code,is_active into v_prefix,v_active from public.internal_service_categories where id=new.category_id for share;
    if not found then raise exception 'Internal service category not found.' using errcode='23503'; end if;
    if not v_active and (tg_op='INSERT' or new.category_id is distinct from old.category_id) then
      raise exception 'Category is inactive.' using errcode='55000';
    end if;
    if left(new.code,char_length(v_prefix)+1)<>v_prefix||'_' or substring(new.code from char_length(v_prefix)+2)!~'^[A-Z0-9]+(_[A-Z0-9]+)*$' then
      raise exception 'Service code must use the selected category prefix.' using errcode='22023';
    end if;
  end if;
  return new;
end;
$$;

-- A durable reservation prevents writes while external file deletion is in
-- progress. Tokens cannot be cleared to reopen a partially deleted Job/service.
create function private.guard_deletion_parent() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if old.deletion_token is not null then raise exception 'Deletion is pending. Retry permanent deletion.' using errcode='55000'; end if;
  return new;
end;
$$;
create trigger a_jobs_guard_deletion before update on public.jobs for each row execute function private.guard_deletion_parent();
create trigger a_internal_services_guard_deletion before update on public.internal_services for each row execute function private.guard_deletion_parent();

create function private.guard_job_deletion_child() returns trigger language plpgsql security definer set search_path='' as $$
declare v_pending uuid;v_id uuid;
begin
  -- Check both ends of a move. Detaching retained reviews during finalization is allowed.
  for v_id in select distinct id from unnest(array[new.job_id,case when tg_op='UPDATE' and tg_table_name not in ('reviews','review_requests') then old.job_id end]) ids(id) where id is not null loop
    select deletion_token into v_pending from public.jobs where id=v_id for share;
    if v_pending is not null then raise exception 'Job deletion is pending.' using errcode='55000'; end if;
  end loop;
  return new;
end;
$$;
do $$ declare t text; begin
  foreach t in array array['job_documents','job_drive_folders','job_steps','tasks','job_task_statuses','job_updates','job_contributors','job_activity_logs','reviews','review_requests'] loop
    execute format('create trigger a_guard_job_deletion before insert or update on public.%I for each row execute function private.guard_job_deletion_child()',t);
  end loop;
end; $$;

create function private.guard_service_deletion_child() returns trigger language plpgsql security definer set search_path='' as $$
declare v_pending uuid;v_id uuid;v_old uuid;
begin
  if tg_table_name in ('jobs','sops') then
    v_id:=new.internal_service_id;
    if tg_op='UPDATE' then v_old:=old.internal_service_id; end if;
  else
    select internal_service_id into v_id from public.sops where id=new.sop_id;
    if tg_op='UPDATE' then select internal_service_id into v_old from public.sops where id=old.sop_id; end if;
  end if;
  for v_id in select distinct id from unnest(array[v_id,v_old]) ids(id) where id is not null loop
    select deletion_token into v_pending from public.internal_services where id=v_id for share;
    if v_pending is not null then raise exception 'Internal service deletion is pending.' using errcode='55000'; end if;
  end loop;
  return new;
end;
$$;
do $$ declare t text; begin
  foreach t in array array['jobs','sops','sop_files','sop_drive_folders','sop_price_items'] loop
    execute format('create trigger a_guard_service_deletion before insert or update on public.%I for each row execute function private.guard_service_deletion_child()',t);
  end loop;
end; $$;

create function public.job_deletion_impact(p_job_id uuid,p_expected_version integer)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_job public.jobs%rowtype;
begin
  if not private.is_active_admin(auth.uid()) then raise exception 'Admin access required.' using errcode='42501'; end if;
  select * into v_job from public.jobs where id=p_job_id;
  if not found then raise exception 'Job not found.' using errcode='P0002'; end if;
  if p_expected_version is null or v_job.version<>p_expected_version then raise exception 'Stale Job version.' using errcode='40001'; end if;
  return jsonb_build_object('title',v_job.title,'pending',v_job.deletion_token is not null,
    'tasks',(select count(*) from public.tasks where job_id=p_job_id),
    'steps',(select count(*) from public.job_steps where job_id=p_job_id),
    'statuses',(select count(*) from public.job_task_statuses where job_id=p_job_id),
    'remarks',(select count(*) from public.job_updates where job_id=p_job_id),
    'contributors',(select count(*) from public.job_contributors where job_id=p_job_id),
    'logs',(select count(*) from public.job_activity_logs where job_id=p_job_id),
    'documents',(select count(*) from public.job_documents where job_id=p_job_id),
    'folders',(select count(*) from public.job_drive_folders where job_id=p_job_id),
    'reviews',(select count(*) from public.reviews where job_id=p_job_id),
    'unusedReviewLinks',(select count(*) from public.review_requests where job_id=p_job_id and used_at is null and revoked_at is null));
end;
$$;

create function public.prepare_job_deletion(p_job_id uuid,p_expected_version integer,p_confirmation text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_job public.jobs%rowtype;v_token uuid;
begin
  if not private.is_active_admin(auth.uid()) then raise exception 'Admin access required.' using errcode='42501'; end if;
  select * into v_job from public.jobs where id=p_job_id for update;
  if not found then raise exception 'Job not found.' using errcode='P0002'; end if;
  if p_expected_version is null or v_job.version<>p_expected_version then raise exception 'Stale Job version.' using errcode='40001'; end if;
  if coalesce(p_confirmation,'')<>v_job.title then raise exception 'Confirmation must exactly match the Job title.' using errcode='22023'; end if;
  v_token:=v_job.deletion_token;
  if v_token is null then
    v_token:=gen_random_uuid();
    update public.jobs set deletion_token=v_token,deletion_started_at=now() where id=p_job_id;
  end if;
  return jsonb_build_object('token',v_token,
    'folders',coalesce((select jsonb_agg(jsonb_build_object('id',google_folder_id,'driveId',google_drive_id)) from public.job_drive_folders where job_id=p_job_id),'[]'::jsonb),
    'files',coalesce((select jsonb_agg(jsonb_build_object('id',google_file_id,'folderId',f.google_folder_id,'driveId',f.google_drive_id))
      from public.job_documents d join public.job_drive_folders f on f.id=d.job_drive_folder_id where d.job_id=p_job_id),'[]'::jsonb));
end;
$$;

create or replace function private.delete_job_graph(p_job_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  -- Preserve published and unpublished reviews, including their client snapshot.
  update public.review_requests set revoked_at=case when used_at is null then coalesce(revoked_at,now()) else revoked_at end,
    revoked_by=case when used_at is null and revoked_at is null then auth.uid() else revoked_by end,job_id=null where job_id=p_job_id;
  update public.reviews set job_id=null where job_id=p_job_id;
  delete from public.job_activity_logs where job_id=p_job_id;
  delete from public.job_documents where job_id=p_job_id;
  delete from public.job_drive_folders where job_id=p_job_id;
  delete from public.tasks where job_id=p_job_id;
  delete from public.job_task_statuses where job_id=p_job_id;
  delete from public.job_updates where job_id=p_job_id;
  delete from public.job_steps where job_id=p_job_id;
  delete from public.job_contributors where job_id=p_job_id;
  delete from public.jobs where id=p_job_id;
end;
$$;

-- Only the server credential can finalize, after external cleanup succeeds.
create function public.finish_job_deletion(p_job_id uuid,p_token uuid,p_actor uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare v_token uuid;
begin
  if auth.role()<>'service_role' or not private.is_active_admin(p_actor) then raise exception 'Server admin access required.' using errcode='42501'; end if;
  select deletion_token into v_token from public.jobs where id=p_job_id for update;
  if not found then return p_job_id; end if; -- Idempotent after an ambiguous response.
  if p_token is null or v_token is distinct from p_token then raise exception 'Invalid deletion token.' using errcode='40001'; end if;
  perform private.delete_job_graph(p_job_id);
  return p_job_id;
end;
$$;

-- Old clients cannot bypass external cleanup for a mapped Drive folder.
create or replace function public.delete_job_permanently(p_job_id uuid,p_expected_version integer,p_confirmation text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_job public.jobs%rowtype;
begin
  if not private.is_active_admin(auth.uid()) then raise exception 'Only an active admin can permanently delete a Job.' using errcode='42501'; end if;
  select * into v_job from public.jobs where id=p_job_id for update;
  if not found or v_job.archived_at is null then raise exception 'Job was not found or is not in Trash.' using errcode='P0002'; end if;
  if p_expected_version is null or v_job.version<>p_expected_version then raise exception 'Job changed before it could be permanently deleted.' using errcode='40001'; end if;
  if coalesce(p_confirmation,'')<>v_job.title then raise exception 'Confirmation must exactly match the Job title.' using errcode='22023'; end if;
  if v_job.deletion_token is not null or exists(select 1 from public.job_drive_folders where job_id=p_job_id) then
    raise exception 'Use the server deletion workflow to clean Drive first.' using errcode='55000';
  end if;
  perform private.delete_job_graph(p_job_id);return p_job_id;
end;
$$;

create function public.prepare_internal_service_deletion(p_id uuid,p_expected_version integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_service public.internal_services%rowtype;v_token uuid;
begin
  if not private.is_active_admin(auth.uid()) then raise exception 'Admin access required.' using errcode='42501'; end if;
  select * into v_service from public.internal_services where id=p_id for update;
  if not found then raise exception 'Internal service not found.' using errcode='P0002'; end if;
  if p_expected_version is null or v_service.version<>p_expected_version then raise exception 'Stale service version.' using errcode='40001'; end if;
  if exists(select 1 from public.jobs where internal_service_id=p_id) then
    update public.internal_services set is_active=false,updated_by=auth.uid(),version=version+1 where id=p_id;
    return jsonb_build_object('result','deactivated');
  end if;
  v_token:=v_service.deletion_token;
  if v_token is null then
    v_token:=gen_random_uuid();
    update public.internal_services set deletion_token=v_token,deletion_started_at=now(),is_active=false where id=p_id;
  end if;
  return jsonb_build_object('result','prepared','token',v_token,
    'folders',coalesce((select jsonb_agg(jsonb_build_object('id',f.google_folder_id,'driveId',f.google_drive_id)) from public.sop_drive_folders f join public.sops s on s.id=f.sop_id where s.internal_service_id=p_id),'[]'::jsonb),
    'files',coalesce((select jsonb_agg(jsonb_build_object('id',d.google_file_id,'folderId',f.google_folder_id,'driveId',f.google_drive_id)) from public.sop_files d join public.sops s on s.id=d.sop_id join public.sop_drive_folders f on f.id=d.sop_drive_folder_id where s.internal_service_id=p_id and d.storage_provider='GOOGLE_DRIVE'),'[]'::jsonb),
    'storage',coalesce((select jsonb_agg(jsonb_build_object('bucket',d.bucket_id,'path',d.storage_path)) from public.sop_files d join public.sops s on s.id=d.sop_id where s.internal_service_id=p_id and d.storage_provider='SUPABASE'),'[]'::jsonb));
end;
$$;

create function private.delete_service_graph(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  delete from public.sop_files where sop_id in(select id from public.sops where internal_service_id=p_id);
  delete from public.sop_price_items where sop_id in(select id from public.sops where internal_service_id=p_id);
  delete from public.sop_drive_folders where sop_id in(select id from public.sops where internal_service_id=p_id);
  delete from public.sops where internal_service_id=p_id;
  delete from public.internal_services where id=p_id;
end;
$$;
create function public.finish_internal_service_deletion(p_id uuid,p_token uuid,p_actor uuid) returns void language plpgsql security definer set search_path='' as $$
declare v_token uuid;
begin
  if auth.role()<>'service_role' or not private.is_active_admin(p_actor) then raise exception 'Server admin access required.' using errcode='42501'; end if;
  select deletion_token into v_token from public.internal_services where id=p_id for update;
  if not found then return; end if;
  if p_token is null or v_token is distinct from p_token then raise exception 'Invalid deletion token.' using errcode='40001'; end if;
  if exists(select 1 from public.jobs where internal_service_id=p_id) then raise exception 'Service is used by Jobs.' using errcode='23503'; end if;
  perform private.delete_service_graph(p_id);
end;
$$;

create or replace function public.remove_internal_service(p_id uuid,p_expected_version integer)
returns text language plpgsql security definer set search_path='' as $$
declare v_version integer;
begin
  if not private.is_active_admin(auth.uid()) then raise exception 'Admin access required.' using errcode='42501'; end if;
  select version into v_version from public.internal_services where id=p_id for update;
  if not found then raise exception 'Internal service not found.' using errcode='P0002'; end if;
  if p_expected_version is null or v_version<>p_expected_version then raise exception 'Stale service version.' using errcode='40001'; end if;
  if exists(select 1 from public.jobs where internal_service_id=p_id) then
    update public.internal_services set is_active=false,updated_by=auth.uid(),version=version+1 where id=p_id;return 'deactivated';
  end if;
  if exists(select 1 from public.sop_drive_folders f join public.sops s on s.id=f.sop_id where s.internal_service_id=p_id)
    or exists(select 1 from public.sop_files f join public.sops s on s.id=f.sop_id where s.internal_service_id=p_id)
    or exists(select 1 from public.internal_services where id=p_id and deletion_token is not null) then
    raise exception 'Use the server deletion workflow to clean SOP files first.' using errcode='55000';
  end if;
  perform private.delete_service_graph(p_id);return 'deleted';
end;
$$;

revoke all on function private.master_reference_counts(text,uuid[]),private.guard_deletion_parent(),private.guard_job_deletion_child(),private.guard_service_deletion_child(),private.delete_service_graph(uuid) from public,anon,authenticated,service_role;
revoke all on function public.remove_master_data(text,uuid,integer),public.save_internal_service_category_state(uuid,integer,text,text,boolean),public.job_deletion_impact(uuid,integer),public.prepare_job_deletion(uuid,integer,text),public.prepare_internal_service_deletion(uuid,integer),public.finish_job_deletion(uuid,uuid,uuid),public.finish_internal_service_deletion(uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.remove_master_data(text,uuid,integer),public.save_internal_service_category_state(uuid,integer,text,text,boolean),public.job_deletion_impact(uuid,integer),public.prepare_job_deletion(uuid,integer,text),public.prepare_internal_service_deletion(uuid,integer) to authenticated;
grant execute on function public.finish_job_deletion(uuid,uuid,uuid),public.finish_internal_service_deletion(uuid,uuid,uuid) to service_role;

comment on column public.jobs.deletion_token is 'Durable server-coordinated permanent deletion reservation; retry deletion after external cleanup failure.';
comment on column public.internal_services.deletion_token is 'Locks the service and its owned SOP during retryable external cleanup.';
commit;
