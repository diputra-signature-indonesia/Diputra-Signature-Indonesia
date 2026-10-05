begin;

-- DB-E: prepare the dormant Q&A table for the future admin CMS without
-- changing the current static frontend source or any stored values.
do $migration$
declare
  has_anwer boolean;
  has_answer boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'question_answer'
      and column_name = 'anwer'
  ) into has_anwer;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'question_answer'
      and column_name = 'answer'
  ) into has_answer;

  if has_anwer and not has_answer then
    execute 'alter table public.question_answer rename column anwer to answer';
  elsif not has_anwer and has_answer then
    null;
  else
    raise exception 'Unexpected question_answer schema: expected exactly one of anwer or answer';
  end if;
end
$migration$;

comment on table public.question_answer is
  'Reserved for the future Q&A CMS. The frontend static dataset remains canonical until the admin remake is complete.';

comment on column public.question_answer.answer is
  'Answer content for a future managed Q&A entry.';

commit;
