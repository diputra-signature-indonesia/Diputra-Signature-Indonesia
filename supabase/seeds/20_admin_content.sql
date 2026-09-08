-- Deterministic local fixtures for admin, blog, review, and contact flows.
-- Q&A intentionally remains unseeded until the CMS cutover makes Supabase
-- the canonical source. All people and contact details below are fictional.

insert into public.blog_posts (
  id,
  slug,
  title,
  excerpt,
  content_md,
  author_name,
  reading_time_min,
  featured_image,
  cover_alt,
  seo_title,
  seo_description,
  og_image,
  published_at,
  status,
  created_at,
  updated_at
)
values
  (
    '61000000-0000-4000-8000-000000000001',
    'local-published-guide',
    'Local Published Guide',
    'Published fixture used to verify public blog pages and metadata.',
    '<h2>Local published article</h2><p>This content exists only in the local development database.</p>',
    'Local Admin',
    2,
    '/image/news_image.png',
    'Local development article cover',
    'Local Published Guide',
    'Published fixture used to verify the local blog detail route.',
    '/og/og-default.png',
    current_date - 3,
    'published',
    now() - interval '4 days',
    now() - interval '3 days'
  ),
  (
    '61000000-0000-4000-8000-000000000002',
    'local-draft-guide',
    'Local Draft Guide',
    'Draft fixture visible only to authorized admin users.',
    '<h2>Local draft article</h2><p>This draft is safe to edit during local development.</p>',
    'Local Staff',
    1,
    '/image/news_image.png',
    'Local draft article cover',
    'Local Draft Guide',
    'Draft fixture for local admin development.',
    '/og/og-default.png',
    null,
    'draft',
    now() - interval '2 days',
    now() - interval '2 days'
  ),
  (
    '61000000-0000-4000-8000-000000000003',
    'local-pending-guide',
    'Local Pending Guide',
    'Pending fixture used to verify the approval workflow.',
    '<h2>Local pending article</h2><p>This article is waiting for an admin decision.</p>',
    'Local Staff',
    1,
    '/image/news_image.png',
    'Local pending article cover',
    'Local Pending Guide',
    'Pending fixture for local approval tests.',
    '/og/og-default.png',
    null,
    'pending',
    now() - interval '1 day',
    now() - interval '1 day'
  ),
  (
    '61000000-0000-4000-8000-000000000004',
    'local-rejected-guide',
    'Local Rejected Guide',
    'Rejected fixture used to verify the corrected database status.',
    '<h2>Local rejected article</h2><p>This article can be revised without affecting Production.</p>',
    'Local Staff',
    1,
    '/image/news_image.png',
    'Local rejected article cover',
    'Local Rejected Guide',
    'Rejected fixture for local workflow tests.',
    '/og/og-default.png',
    null,
    'rejected',
    now() - interval '12 hours',
    now() - interval '12 hours'
  )
on conflict (id) do update set
  slug = excluded.slug,
  title = excluded.title,
  excerpt = excluded.excerpt,
  content_md = excluded.content_md,
  author_name = excluded.author_name,
  reading_time_min = excluded.reading_time_min,
  featured_image = excluded.featured_image,
  cover_alt = excluded.cover_alt,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  og_image = excluded.og_image,
  published_at = excluded.published_at,
  status = excluded.status,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

-- Raw local tokens are intentionally predictable and non-secret:
-- valid   = 64 x "e"
-- expired = 64 x "f"
-- used    = 64 x "0"
-- revoked = 64 x "2"
insert into public.review_requests (
  id,
  token_hash,
  client_name,
  client_email,
  expires_at,
  used_at,
  revoked_at,
  created_at
)
values
  (
    '62000000-0000-4000-8000-000000000001',
    encode(extensions.digest(repeat('e', 64), 'sha256'), 'hex'),
    'Local Valid Client',
    'valid-client@example.test',
    now() + interval '7 days',
    null,
    null,
    now()
  ),
  (
    '62000000-0000-4000-8000-000000000002',
    encode(extensions.digest(repeat('f', 64), 'sha256'), 'hex'),
    'Local Expired Client',
    'expired-client@example.test',
    now() - interval '1 day',
    null,
    null,
    now() - interval '8 days'
  ),
  (
    '62000000-0000-4000-8000-000000000003',
    encode(extensions.digest(repeat('0', 64), 'sha256'), 'hex'),
    'Local Used Client',
    'used-client@example.test',
    now() + interval '7 days',
    now(),
    null,
    now() - interval '1 day'
  ),
  (
    '62000000-0000-4000-8000-000000000004',
    encode(extensions.digest(repeat('2', 64), 'sha256'), 'hex'),
    'Local Revoked Client',
    'revoked-client@example.test',
    now() + interval '7 days',
    null,
    now(),
    now() - interval '1 day'
  )
on conflict (id) do update set
  token_hash = excluded.token_hash,
  client_name = excluded.client_name,
  client_email = excluded.client_email,
  expires_at = excluded.expires_at,
  used_at = excluded.used_at,
  revoked_at = excluded.revoked_at,
  created_at = excluded.created_at;

insert into public.reviews (
  id,
  review_request_id,
  name,
  email,
  message,
  is_published,
  is_featured,
  created_at
)
values
  (
    '63000000-0000-4000-8000-000000000001',
    '62000000-0000-4000-8000-000000000003',
    'Local Featured Reviewer',
    'featured-reviewer@example.test',
    'This featured review is safe local fixture data.',
    true,
    true,
    now() - interval '1 day'
  ),
  (
    '63000000-0000-4000-8000-000000000002',
    null,
    'Local Published Reviewer',
    'published-reviewer@example.test',
    'This published review verifies the public carousel.',
    true,
    false,
    now() - interval '2 days'
  ),
  (
    '63000000-0000-4000-8000-000000000003',
    null,
    'Local Hidden Reviewer',
    'hidden-reviewer@example.test',
    'This unpublished review must remain hidden from public queries.',
    false,
    false,
    now()
  )
on conflict (id) do update set
  review_request_id = excluded.review_request_id,
  name = excluded.name,
  email = excluded.email,
  message = excluded.message,
  is_published = excluded.is_published,
  is_featured = excluded.is_featured,
  created_at = excluded.created_at;

insert into public.contact_messages (id, name, email, phone, message, status, created_at)
values
  ('64000000-0000-4000-8000-000000000001', 'Local New Contact', 'new-contact@example.test', '+62 811 0000 0001', 'Local contact waiting to be processed.', 'new', now()),
  ('64000000-0000-4000-8000-000000000002', 'Local Active Contact', 'active-contact@example.test', '+62 811 0000 0002', 'Local contact currently being processed.', 'in_progress', now() - interval '1 day'),
  ('64000000-0000-4000-8000-000000000003', 'Local Replied Contact', 'replied-contact@example.test', '+62 811 0000 0003', 'Local contact that already received a reply.', 'replied', now() - interval '2 days'),
  ('64000000-0000-4000-8000-000000000004', 'Local Closed Contact', 'closed-contact@example.test', '+62 811 0000 0004', 'Local contact whose workflow is complete.', 'closed', now() - interval '3 days'),
  ('64000000-0000-4000-8000-000000000005', 'Local Spam Contact', 'spam-contact@example.test', '+62 811 0000 0005', 'Local contact classified as harmless fixture spam.', 'spam', now() - interval '4 days');
