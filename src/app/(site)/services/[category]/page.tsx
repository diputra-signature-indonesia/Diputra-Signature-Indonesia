interface ServicesCategoryProps {
  params: { slug: string };
}

export default function ServicesCategoryPage({ params }: ServicesCategoryProps) {
  return <div>Blog Detail Page (slug: {params.slug}) (TODO)</div>;
}
