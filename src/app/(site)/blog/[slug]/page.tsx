import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPost } from '@/lib/get-post';
import { buildBlogPostMetadata } from '@/lib/meta-helpers';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug);

  if (!post) {
    notFound();
  }

  // tinggal pakai helper
  return buildBlogPostMetadata(post);
}

interface BlogDetailProps {
  params: { slug: string };
}

export default function BlogDetailPage({ params }: BlogDetailProps) {
  return <div>Blog Detail Page (slug: {params.slug}) (TODO)</div>;
}
