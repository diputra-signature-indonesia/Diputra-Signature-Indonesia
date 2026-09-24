import { getPublishedBlogPosts } from '@/lib/supabase/queries';
import { SITE_URL } from '@/lib/site-config';

function xml(value: string) {
  return value.replace(/[<>&'\"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character] ?? character);
}

export async function GET() {
  const posts = await getPublishedBlogPosts(50);
  const items = posts.map((post) => `
    <item>
      <title>${xml(post.title ?? 'Article')}</title>
      <link>${SITE_URL}/blog/${xml(post.slug)}</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${xml(post.slug)}</guid>
      <description>${xml(post.excerpt ?? '')}</description>
      ${post.published_at ? `<pubDate>${new Date(post.published_at).toUTCString()}</pubDate>` : ''}
    </item>`).join('');
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Diputra Signature Indonesia Blog &amp; Insights</title>
  <link>${SITE_URL}/blog</link>
  <description>Legal updates, business insights, immigration news, and company announcements.</description>
  <language>en</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}
</channel></rss>`;
  return new Response(body, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=900, s-maxage=3600' } });
}
