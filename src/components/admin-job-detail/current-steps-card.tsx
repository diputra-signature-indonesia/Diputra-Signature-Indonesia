'use client';

import { AdminModal } from '@/components/layout-admin/admin-modal';
import { jobSteps } from '@/data/admin-job-detail/job-detail-dummy-data';
import { Check } from 'lucide-react';
import { useState } from 'react';

type PendingStepChange = {
  index: number;
  action: 'complete' | 'reopen';
};

export function CurrentStepsCard() {
  const [completedCount, setCompletedCount] = useState(2);
  const [pendingChange, setPendingChange] = useState<PendingStepChange | null>(null);

  const requestStepChange = (index: number) => {
    if (index > completedCount) return;
    setPendingChange({ index, action: index < completedCount ? 'reopen' : 'complete' });
  };

  const confirmStepChange = () => {
    if (!pendingChange) return;
    setCompletedCount(pendingChange.action === 'complete' ? pendingChange.index + 1 : pendingChange.index);
    setPendingChange(null);
  };

  const selectedStep = pendingChange ? jobSteps[pendingChange.index] : null;
  const completedTrackWidth =
    jobSteps.length > 1 ? `${(Math.max(completedCount - 1, 0) / (jobSteps.length - 1)) * 100}%` : '0%';

  return (
    <>
      <section className="rounded-xl border border-[#D9DDE3] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <h2 className="text-lg font-semibold text-[#282828]">Current Steps</h2>
        <p className="mt-1 text-xs text-[#69524F]">Only the PIC and admin can change the status of these steps.</p>

        <div className="mt-5 overflow-x-auto pb-1">
          <div className="relative min-w-[560px]">
            <div aria-hidden="true" className="absolute top-4 right-7 left-7 h-px bg-[#E0B5B0]">
              <span className="block h-full bg-[#20BF6B] transition-[width] duration-300" style={{ width: completedTrackWidth }} />
            </div>

            <div className="relative flex justify-between px-3">
            {jobSteps.map((step, index) => {
              const completed = index < completedCount;
              const current = index === completedCount;
              const enabled = index <= completedCount;

              return (
                <div key={step.id} className="flex w-8 shrink-0 flex-col items-center text-center">
                  <button
                    type="button"
                    disabled={!enabled}
                    onClick={() => requestStepChange(index)}
                    aria-label={`${completed ? 'Reopen' : current ? 'Complete' : 'Locked'} step ${step.label}`}
                    className={`relative z-10 flex size-8 items-center justify-center rounded-full border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/30 ${
                      completed
                        ? 'border-[#20BF6B] bg-[#20BF6B] text-white hover:bg-[#18A95D]'
                        : current
                          ? 'border-[#9F1010] bg-[#FFF9F8] text-[#9F1010] hover:bg-[#FFF0EE]'
                          : 'cursor-not-allowed border-[#E5BBB6] bg-[#FFF9F8] text-[#E5BBB6]'
                    }`}
                  >
                    {completed ? <Check aria-hidden="true" className="size-4" strokeWidth={2.5} /> : current ? <span className="size-2.5 rounded-full bg-current" /> : null}
                  </button>
                  <span className={`mt-2 whitespace-nowrap text-xs font-semibold ${completed ? 'text-[#2B2B2B]' : current ? 'text-[#9F1010]' : 'text-[#E1B8B3]'}`}>{step.label}</span>
                </div>
              );
            })}
            </div>
          </div>
        </div>
      </section>

      <AdminModal
        open={Boolean(pendingChange)}
        onClose={() => setPendingChange(null)}
        title={pendingChange?.action === 'reopen' ? `Reopen tahap ${selectedStep?.label}?` : `Selesaikan tahap ${selectedStep?.label}?`}
        description={
          pendingChange?.action === 'reopen'
            ? 'Tahap ini dan seluruh tahapan setelahnya akan kembali berstatus belum selesai.'
            : 'Tahap berikutnya akan terbuka dan dapat mulai dikerjakan.'
        }
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setPendingChange(null)} className="h-9 rounded border border-[#9EACBF] bg-white px-5 text-xs font-semibold text-[#25344A] hover:bg-gray-50">
              Cancel
            </button>
            <button type="button" onClick={confirmStepChange} className="h-9 rounded bg-[#9F1010] px-5 text-xs font-semibold text-white hover:bg-[#7E0C0C]">
              Confirm
            </button>
          </>
        }
      />
    </>
  );
}
