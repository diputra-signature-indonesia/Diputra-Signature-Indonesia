interface BlogDetailProps {
  params: { slug: string };
}

export default function BlogDetailPage({ params }: BlogDetailProps) {
  return <div>Blog Detail Page (slug: {params.slug}) (TODO)</div>;
}
