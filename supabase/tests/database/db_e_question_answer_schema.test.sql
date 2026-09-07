begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(5);

select extensions.is(
  (
    select count(*)::bigint
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'question_answer'
      and column_name = 'answer'
  ),
  1::bigint,
  'question_answer exposes the corrected answer column'
);

select extensions.is(
  (
    select count(*)::bigint
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'question_answer'
      and column_name = 'anwer'
  ),
  0::bigint,
  'legacy anwer typo no longer exists'
);

select extensions.is(
  (
    select data_type
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'question_answer'
      and column_name = 'answer'
  ),
  'text',
  'answer retains the text data type'
);

select extensions.ok(
  (
    select is_nullable = 'NO'
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'question_answer'
      and column_name = 'answer'
  ),
  'answer retains its NOT NULL contract'
);

insert into public.question_answer (id, question, answer, is_visible)
values (
  '90000000-0000-4000-8000-000000000501',
  'DB-E temporary question',
  'DB-E temporary answer',
  false
);

select extensions.is(
  (
    select answer
    from public.question_answer
    where id = '90000000-0000-4000-8000-000000000501'
  ),
  'DB-E temporary answer',
  'the corrected column accepts and returns Q&A content'
);

select extensions.finish();

rollback;
