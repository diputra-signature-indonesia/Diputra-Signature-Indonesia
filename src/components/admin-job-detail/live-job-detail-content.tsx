import type { LiveJobDetail } from '@/lib/supabase/queries/job-detail';
import { LiveContributorCard } from './live-contributor-card';
import { LiveCurrentStepsCard } from './live-current-steps-card';
import { LiveJobInformationCard } from './live-job-information-card';
import { LiveMoreFromClientCard } from './live-more-from-client-card';
import { LiveRemarksCard } from './live-remarks-card';

export function LiveJobDetailContent({ detail }: { detail: LiveJobDetail }) {
  return <div className="space-y-5 px-4 py-5 sm:px-5 lg:px-6"><LiveJobInformationCard detail={detail} /><LiveCurrentStepsCard detail={detail} /><section className="grid items-start gap-5 xl:grid-cols-[minmax(0,2.08fr)_minmax(300px,1fr)]"><LiveRemarksCard detail={detail} /><div className="space-y-5"><LiveContributorCard contributors={detail.contributors} /><LiveMoreFromClientCard jobs={detail.relatedJobs} clientName={detail.summary.client} /></div></section></div>;
}
