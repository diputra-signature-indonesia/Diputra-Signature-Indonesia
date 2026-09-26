import { CalendarDays, ListFilter, Plus, UserRound } from 'lucide-react';
import { jobRemarks } from '@/data/admin-job-detail/job-detail-dummy-data';

function RemarkMetadata({ assignedTo, author, createdAt }: { assignedTo?: string; author: string; createdAt: string }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#695E5C]">
      {assignedTo ? (
        <span className="flex items-center gap-1"><UserRound aria-hidden="true" className="size-3" />Assigned To: <strong>{assignedTo}</strong></span>
      ) : null}
      <span className="flex items-center gap-1"><ListFilter aria-hidden="true" className="size-3" />By: {author}</span>
      <span className="flex items-center gap-1"><CalendarDays aria-hidden="true" className="size-3" />Created: {createdAt}</span>
    </div>
  );
}

export function RemarksCard() {
  const latestRemark = jobRemarks.find((remark) => remark.latest);
  const previousRemarks = jobRemarks.filter((remark) => !remark.latest);

  return (
    <section className="rounded-xl border border-[#D9DDE3] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-[#2A2020]">Remarks</h2>
          <span className="flex size-6 items-center justify-center rounded-full bg-[#DDF8E8] text-xs font-semibold text-[#2D7B4F]">2</span>
        </div>
        <button type="button" aria-label="Add remark" title="Add remark" className="flex size-8 items-center justify-center rounded-lg text-[#2A2020] transition hover:bg-gray-100">
          <Plus aria-hidden="true" className="size-5" />
        </button>
      </div>

      {latestRemark ? (
        <article className="mt-4 rounded-lg border border-[#D9DDE3] p-4">
          <p className="text-base font-medium text-[#2F2928]">{latestRemark.message}</p>
          <RemarkMetadata author={latestRemark.author} createdAt={latestRemark.createdAt} />
          <p className="mt-2 text-xs text-emerald-600">Progress: {latestRemark.progressDate}</p>
        </article>
      ) : null}

      <div className="relative mt-5 ml-4 border-l border-[#D5D5D5] pl-6">
        {previousRemarks.map((remark, index) => (
          <article key={remark.id} className={`relative py-3 ${index < previousRemarks.length - 1 ? 'border-b border-[#E0E0E0]' : ''}`}>
            <span className="absolute top-5 -left-[31px] size-3.5 rounded-full bg-[#D5D5D5]" />
            <p className="text-sm font-medium text-[#2F2928]">{remark.message}</p>
            <RemarkMetadata assignedTo={remark.assignedTo} author={remark.author} createdAt={remark.createdAt} />
            <p className="mt-2 text-[10px] text-[#817977]">Progress: {remark.progressDate}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
