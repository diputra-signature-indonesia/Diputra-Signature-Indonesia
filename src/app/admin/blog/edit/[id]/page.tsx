interface EditBlogProps {
  params: { id: string };
}

export default function AdminEditBlogPage({ params }: EditBlogProps) {
  return <div>Edit Blog Page (id: {params.id}) (TODO)</div>;
}
