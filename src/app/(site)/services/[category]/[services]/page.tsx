interface ServicesDetailsProps {
  params: { slug: string };
}

export default function ServicesDetailsPage({ params }: ServicesDetailsProps) {
  return <div>Blog Detail Page (slug: {params.slug}) (TODO)</div>;
}
