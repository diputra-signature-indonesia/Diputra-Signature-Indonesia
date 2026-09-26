import type { PicTaskLoad } from '@/types/admin-dashboard';

const legend = [
  { label: 'Belum Dimulai', color: '#D3D8DE' },
  { label: 'Dalam Proses', color: '#F2C900' },
  { label: 'Tertunda', color: '#7B0000' },
];

export function DashboardPicLoadCard({ taskLoads }: { taskLoads: PicTaskLoad[] }) {
  return (
    <article className="flex h-[420px] min-h-0 flex-col rounded-xl border border-[#DEE2E7] bg-white p-5 shadow-[0_2px_4px_rgba(15,23,42,0.05)] sm:p-6">
      <h2 className="text-xl font-semibold text-[#202938]">Beban Task per PIC</h2>

      <div aria-label="Daftar beban task per PIC" tabIndex={0} className="mt-5 min-h-0 flex-1 space-y-4 overflow-y-auto pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A61919]/20 [scrollbar-color:#CBD2DC_transparent] [scrollbar-width:thin]">
        {taskLoads.length === 0 ? (
          <div className="flex h-full min-h-40 items-center justify-center rounded-lg border border-dashed border-[#D9DEE5] bg-[#FAFBFC] px-4 text-center text-sm text-[#98A1B0]">
            Tidak ada task aktif untuk filter ini.
          </div>
        ) : null}
        {taskLoads.map((item) => {
          const total = item.notStarted + item.inProgress + item.delayed;
          const toWidth = (value: number) => `${total > 0 ? (value / total) * 100 : 0}%`;

          return (
            <div key={item.id}>
              <div className="mb-1.5 flex items-center justify-between text-sm text-[#303846]">
                <span>{item.name}</span>
                <span className="font-semibold">{total} Task</span>
              </div>
              <div className="flex h-3 overflow-hidden rounded-full bg-[#F5F6F8]">
                {item.notStarted > 0 ? <span className="bg-[#D3D8DE]" style={{ width: toWidth(item.notStarted) }} /> : null}
                {item.inProgress > 0 ? <span className="bg-[#F2C900]" style={{ width: toWidth(item.inProgress) }} /> : null}
                {item.delayed > 0 ? <span className="bg-[#7B0000]" style={{ width: toWidth(item.delayed) }} /> : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex shrink-0 flex-wrap gap-x-5 gap-y-2 border-t border-[#EEF0F3] pt-4">
        {legend.map((item) => (
          <span key={item.label} className="flex items-center gap-2 text-xs text-[#626B78]">
            <span className="size-3 rounded-sm" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </article>
  );
}
