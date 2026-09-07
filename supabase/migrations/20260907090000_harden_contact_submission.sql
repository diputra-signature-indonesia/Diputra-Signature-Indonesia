begin;

-- DB-D: enforce the public contact contract for all new writes without
-- scanning or rejecting legacy Production rows during the initial rollout.
alter table public.contact_messages
  drop constraint if exists contact_messages_name_contract,
  add constraint contact_messages_name_contract
    check (
      char_length(btrim(name)) between 2 and 100
      and name !~ '[[:cntrl:]]'
    ) not valid;

alter table public.contact_messages
  drop constraint if exists contact_messages_email_contract,
  add constraint contact_messages_email_contract
    check (
      email is not null
      and char_length(btrim(email)) between 3 and 254
      and email !~ '[[:cntrl:]]'
      and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ) not valid;

alter table public.contact_messages
  drop constraint if exists contact_messages_phone_contract,
  add constraint contact_messages_phone_contract
    check (
      phone is not null
      and char_length(btrim(phone)) between 7 and 32
      and phone !~ '[[:cntrl:]]'
      and phone ~ '^[0-9+(). -]+$'
    ) not valid;

alter table public.contact_messages
  drop constraint if exists contact_messages_message_contract,
  add constraint contact_messages_message_contract
    check (
      char_length(btrim(message)) between 10 and 5000
      and translate(message, E'\n\r', '') !~ '[[:cntrl:]]'
    ) not valid;

-- The contact form now writes through a dedicated server-only Supabase
-- Secret client after Turnstile verification. Browser-facing roles no longer
-- have any direct insert capability.
drop policy if exists "contact_messages_insert_public" on public.contact_messages;
revoke insert on table public.contact_messages from anon, authenticated;
grant insert on table public.contact_messages to service_role;

commit;
