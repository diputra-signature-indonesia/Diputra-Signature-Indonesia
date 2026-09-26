import { ContributorCard } from './contributor-card';
import { CurrentStepsCard } from './current-steps-card';
import { JobInformationCard } from './job-information-card';
import { MoreFromClientCard } from './more-from-client-card';
import { RemarksCard } from './remarks-card';

export function JobDetailContent() {
  return (
    <div className="space-y-5 px-4 py-5 sm:px-5 lg:px-6">
      <JobInformationCard />
      <CurrentStepsCard />

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,2.08fr)_minmax(300px,1fr)]">
        <RemarksCard />
        <div className="space-y-5">
          <ContributorCard />
          <MoreFromClientCard />
        </div>
      </section>
    </div>
  );
}
