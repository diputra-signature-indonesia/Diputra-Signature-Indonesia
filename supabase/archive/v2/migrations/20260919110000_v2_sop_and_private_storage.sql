begin;

-- V2 phase 4: one editable SOP per internal service, private files, and an
-- IDR-only price list. Storage object writes remain two-phase by design.

create table public.sops (
  id uuid primary key default gen_random_uuid(),
  internal_service_id uuid not null unique references public.internal_services(id) on delete restrict,
  description text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0)
);

create table public.sop_files (
  id uuid primary key default gen_random_uuid(),
  sop_id uuid not null references public.sops(id) on delete restrict,
  file_type text not null,
  title text not null,
  original_filename text not null,
  bucket_id text not null default 'sop-documents',
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  sort_order integer not null default 0,
  upload_status text not null default 'PENDING',
  uploaded_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  constraint sop_files_type_check check (file_type in ('FLOW','REQUIREMENT')),
  constraint sop_files_bucket_check check (bucket_id='sop-documents'),
  constraint sop_files_status_check check (upload_status in ('PENDING','READY','FAILED')),
  constraint sop_files_title_not_blank check (char_length(btrim(title)) between 1 and 240),
  constraint sop_files_name_not_blank check (char_length(btrim(original_filename)) between 1 and 255),
  constraint sop_files_upload_state check (
    (upload_status='READY' and uploaded_at is not null)
    or (upload_status in ('PENDING','FAILED') and uploaded_at is null)
  ),
  constraint sop_files_delete_state check (
    (deleted_at is null and deleted_by is null)
    or (deleted_at is not null and deleted_by is not null)
  )
);

create unique index sop_files_one_ready_flow_idx
  on public.sop_files(sop_id)
  where file_type='FLOW' and upload_status='READY' and deleted_at is null;
create index sop_files_active_order_idx
  on public.sop_files(sop_id,file_type,sort_order,id) where deleted_at is null;

create table public.sop_price_items (
  id uuid primary key default gen_random_uuid(),
  sop_id uuid not null references public.sops(id) on delete restrict,
  item_name text not null,
  amount numeric(18,2) not null check (amount>=0),
  currency text not null default 'IDR' check (currency='IDR'),
  notes text,
  sort_order integer not null default 0,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version>0),
  constraint sop_price_items_name_not_blank check (char_length(btrim(item_name)) between 1 and 240),
  constraint sop_price_items_sop_order_key unique(sop_id,sort_order) deferrable initially immediate
);

do $$
declare v_table text;
begin
  foreach v_table in array array['sops','sop_files','sop_price_items'] loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()',v_table,v_table);
    execute format('alter table public.%I enable row level security',v_table);
    execute format('revoke all privileges on table public.%I from anon,authenticated',v_table);
    execute format('grant select on table public.%I to authenticated',v_table);
    execute format('grant all privileges on table public.%I to service_role',v_table);
  end loop;
end; $$;

create policy "Active staff read SOPs" on public.sops for select to authenticated using(public.is_staff_role());
create policy "Active staff read ready SOP files" on public.sop_files for select to authenticated using(public.is_staff_role() and upload_status='READY' and deleted_at is null);
create policy "Active staff read SOP prices" on public.sop_price_items for select to authenticated using(public.is_staff_role());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('sop-documents','sop-documents',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp']::text[])
on conflict(id) do update set
  name=excluded.name,
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types,
  updated_at=now();

drop policy if exists "V2 admins upload reserved SOP documents" on storage.objects;
drop policy if exists "V2 staff read ready SOP documents" on storage.objects;
drop policy if exists "V2 admins delete retired SOP documents" on storage.objects;

create policy "V2 admins upload reserved SOP documents"
on storage.objects for insert to authenticated
with check(
  bucket_id='sop-documents'
  and public.is_admin_role()
  and owner_id=auth.uid()::text
  and exists(
    select 1 from public.sop_files f
    where f.bucket_id=storage.objects.bucket_id
      and f.storage_path=storage.objects.name
      and f.upload_status='PENDING'
      and f.deleted_at is null
      and f.created_by=auth.uid()
  )
);

create policy "V2 staff read ready SOP documents"
on storage.objects for select to authenticated
using(
  bucket_id='sop-documents'
  and public.is_staff_role()
  and exists(
    select 1 from public.sop_files f
    where f.bucket_id=storage.objects.bucket_id
      and f.storage_path=storage.objects.name
      and f.upload_status='READY'
      and f.deleted_at is null
  )
);

create policy "V2 admins delete retired SOP documents"
on storage.objects for delete to authenticated
using(
  bucket_id='sop-documents'
  and public.is_admin_role()
  and exists(
    select 1 from public.sop_files f
    where f.bucket_id=storage.objects.bucket_id
      and f.storage_path=storage.objects.name
      and f.deleted_at is not null
  )
);

create or replace function public.save_sop(p_internal_service_id uuid,p_description text,p_expected_version integer default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_id uuid;
begin
  if not private.is_active_admin(v_actor) then raise exception 'Admin access required.' using errcode='42501'; end if;
  if not exists(select 1 from public.internal_services where id=p_internal_service_id) then raise exception 'Internal service not found.' using errcode='23503'; end if;
  select id into v_id from public.sops where internal_service_id=p_internal_service_id for update;
  if v_id is null then
    insert into public.sops(internal_service_id,description,created_by,updated_by) values(p_internal_service_id,nullif(btrim(p_description),''),v_actor,v_actor) returning id into v_id;
  else
    update public.sops set description=nullif(btrim(p_description),''),updated_by=v_actor,version=version+1
    where id=v_id and version=p_expected_version;
    if not found then raise exception 'Stale SOP version.' using errcode='40001'; end if;
  end if;
  return v_id;
end; $$;

create or replace function public.save_sop_price_items(p_sop_id uuid,p_sop_expected_version integer,p_items jsonb)
returns integer language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_version integer;
begin
  if not private.is_active_admin(v_actor) then raise exception 'Admin access required.' using errcode='42501'; end if;
  if jsonb_typeof(p_items)<>'array' then raise exception 'Price items must be an array.' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements(p_items)e where btrim(coalesce(e->>'item_name',''))='' or coalesce((e->>'amount')::numeric,-1)<0) then raise exception 'Every price row requires a name and non-negative amount.' using errcode='22023'; end if;
  select version into v_version from public.sops where id=p_sop_id for update;
  if not found then raise exception 'SOP not found.' using errcode='P0002'; end if;
  if v_version<>p_sop_expected_version then raise exception 'Stale SOP version.' using errcode='40001'; end if;
  delete from public.sop_price_items where sop_id=p_sop_id;
  insert into public.sop_price_items(sop_id,item_name,amount,currency,notes,sort_order,created_by,updated_by)
  select p_sop_id,btrim(e.value->>'item_name'),(e.value->>'amount')::numeric,'IDR',nullif(btrim(e.value->>'notes'),''),e.ordinality::integer,v_actor,v_actor
  from jsonb_array_elements(p_items) with ordinality e(value,ordinality);
  update public.sops set updated_by=v_actor,version=version+1 where id=p_sop_id returning version into v_version;
  return v_version;
end; $$;

create or replace function public.prepare_sop_file_upload(
  p_sop_id uuid,p_file_type text,p_title text,p_original_filename text,p_mime_type text,p_size_bytes bigint,p_sort_order integer default 0
)
returns table(file_id uuid,bucket_id text,storage_path text)
language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_id uuid:=gen_random_uuid(); v_type text:=upper(btrim(p_file_type)); v_ext text; v_path text;
begin
  if not private.is_active_admin(v_actor) then raise exception 'Admin access required.' using errcode='42501'; end if;
  if not exists(select 1 from public.sops where id=p_sop_id) then raise exception 'SOP not found.' using errcode='P0002'; end if;
  if p_size_bytes is null or p_size_bytes<=0 or p_size_bytes>10485760 then raise exception 'File must be 10 MiB or smaller.' using errcode='22023'; end if;
  if v_type='FLOW' and p_mime_type not in('application/pdf','image/jpeg','image/png','image/webp') then raise exception 'Unsupported Flow file type.' using errcode='22023'; end if;
  if v_type='REQUIREMENT' and p_mime_type<>'application/pdf' then raise exception 'Requirement files must be PDF.' using errcode='22023'; end if;
  if v_type not in('FLOW','REQUIREMENT') then raise exception 'Unsupported SOP file type.' using errcode='22023'; end if;
  v_ext:=case p_mime_type when 'application/pdf' then 'pdf' when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp' end;
  v_path:=format('sops/%s/%s.%s',p_sop_id,v_id,v_ext);
  insert into public.sop_files(id,sop_id,file_type,title,original_filename,storage_path,mime_type,size_bytes,sort_order,created_by,updated_by)
  values(v_id,p_sop_id,v_type,btrim(p_title),btrim(p_original_filename),v_path,p_mime_type,p_size_bytes,p_sort_order,v_actor,v_actor);
  return query select v_id,'sop-documents'::text,v_path;
end; $$;

create or replace function public.finalize_sop_file_upload(p_file_id uuid,p_expected_version integer)
returns integer language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_file public.sop_files%rowtype; v_object storage.objects%rowtype; v_size bigint; v_mime text; v_version integer;
begin
  if not private.is_active_admin(v_actor) then raise exception 'Admin access required.' using errcode='42501'; end if;
  select * into v_file from public.sop_files where id=p_file_id for update;
  if not found then raise exception 'File reservation not found.' using errcode='P0002'; end if;
  if v_file.version<>p_expected_version or v_file.upload_status<>'PENDING' or v_file.deleted_at is not null then raise exception 'File reservation is unavailable or stale.' using errcode='40001'; end if;
  select * into v_object from storage.objects where bucket_id=v_file.bucket_id and name=v_file.storage_path;
  if not found then raise exception 'Uploaded object not found.' using errcode='P0002'; end if;
  v_size:=coalesce((v_object.metadata->>'size')::bigint,0);
  v_mime:=coalesce(v_object.metadata->>'mimetype','');
  if v_size<>v_file.size_bytes or v_size>10485760 or v_mime<>v_file.mime_type then
    update public.sop_files set upload_status='FAILED',updated_by=v_actor,version=version+1 where id=p_file_id;
    raise exception 'Uploaded object metadata does not match the reservation.' using errcode='22023';
  end if;
  if v_file.file_type='FLOW' then
    update public.sop_files set deleted_at=pg_catalog.now(),deleted_by=v_actor,updated_by=v_actor,version=version+1
    where sop_id=v_file.sop_id and file_type='FLOW' and upload_status='READY' and deleted_at is null and id<>p_file_id;
  end if;
  update public.sop_files set upload_status='READY',uploaded_at=pg_catalog.now(),updated_by=v_actor,version=version+1 where id=p_file_id returning version into v_version;
  return v_version;
end; $$;

create or replace function public.mark_sop_file_deleted(p_file_id uuid,p_expected_version integer)
returns text language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_path text;
begin
  if not private.is_active_admin(v_actor) then raise exception 'Admin access required.' using errcode='42501'; end if;
  update public.sop_files set deleted_at=pg_catalog.now(),deleted_by=v_actor,updated_by=v_actor,version=version+1
  where id=p_file_id and version=p_expected_version and deleted_at is null returning storage_path into v_path;
  if not found then raise exception 'SOP file not found, deleted, or stale.' using errcode='40001'; end if;
  return v_path;
end; $$;

do $$
declare r record;
begin
  for r in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('save_sop','save_sop_price_items','prepare_sop_file_upload','finalize_sop_file_upload','mark_sop_file_deleted') loop
    execute format('revoke all on function %s from public,anon,authenticated,service_role',r.signature);
    execute format('grant execute on function %s to authenticated',r.signature);
    execute format('grant execute on function %s to service_role',r.signature);
  end loop;
end; $$;

comment on table public.sops is 'One directly editable internal SOP per internal service; no business draft lifecycle.';
comment on table public.sop_files is 'Private Storage metadata. Object upload/delete is intentionally a retryable two-phase operation.';

commit;
