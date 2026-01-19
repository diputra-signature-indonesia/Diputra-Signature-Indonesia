import CreateUrlForm from '@/components/layout-admin/review-url-form';

export default async function GenerateReviewUrlPage() {
  return (
    <section className="font-raleway flex h-full w-full flex-col px-4 py-6">
      <CreateUrlForm />
    </section>
  );
}
