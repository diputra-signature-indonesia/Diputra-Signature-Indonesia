import type { PicTaskLoad } from '@/data/admin-dashboard/dashboard-dummy-data';

const legend = [
  { label: 'Belum Dimulai', color: '#D3D8DE' },
  { label: 'Dalam Proses', color: '#F2C900' },
  { label: 'Tertunda', color: '#7B0000' },
];

export function DashboardPicLoadCard({ taskLoads }: { taskLoads: PicTaskLoad[] }) {
  return (
    <article className="rounded-xl border border-[#DEE2E7] bg-white p-5 shadow-[0_2px_4px_rgba(15,23,42,0.05)] sm:p-6">
      <h2 className="text-xl font-semibold text-[#202938]">Beban Task per PIC</h2>

      <div className="mt-5 space-y-4">
        {taskLoads.map((item) => {
          const total = item.notStarted + item.inProgress + item.delayed;
          const toWidth = (value: number) => `${(value / total) * 100}%`;

          return (
            <div key={item.name}>
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

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
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
