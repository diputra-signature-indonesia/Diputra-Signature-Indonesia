// UNTUK SEMENTARA — agar tidak error
export async function getPost(slug: string) {
  // return null agar generateMetadata otomatis jalankan notFound()
  return {
    title: `Dummy title for ${slug}`,
    slug: `${slug}`,
    excerpt: 'This is a placeholder excerpt.',
    description: 'This is a placeholder excerpt.',
    date: '2025-01-01',
    updatedAt: '2025-01-01',
  };
}
