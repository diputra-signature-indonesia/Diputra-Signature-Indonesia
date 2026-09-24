import { redirect } from 'next/navigation';

export default async function GenerateReviewUrlPage() {
  redirect('/admin/reviews?generate=1');
}
