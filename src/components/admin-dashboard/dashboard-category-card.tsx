import type { TaskInternalServiceSummary } from '@/types/admin-dashboard';

function buildConicGradient(internalServices: TaskInternalServiceSummary[], total: number) {
  if (total <= 0) return '#EEF0F3';
  let cursor = 0;

  const stops = internalServices.map((service) => {
    const start = cursor;
    cursor += (service.value / total) * 100;
    return `${service.color} ${start}% ${cursor}%`;
  });

  return `conic-gradient(${stops.join(', ')})`;
}

export function DashboardCategoryCard({ internalServices }: { internalServices: TaskInternalServiceSummary[] }) {
  const total = internalServices.reduce((sum, service) => sum + service.value, 0);

  return (
    <article className="flex h-[420px] min-h-0 flex-col rounded-xl border border-[#DEE2E7] bg-white p-5 shadow-[0_2px_4px_rgba(15,23,42,0.05)] sm:p-6">
      <h2 className="text-xl font-semibold text-[#202938]">Task Berdasarkan Internal Service</h2>

      <div className="mt-6 flex min-h-0 flex-1 flex-col items-center justify-center gap-8 sm:flex-row">
        <div className="relative size-48 shrink-0 rounded-full" style={{ background: buildConicGradient(internalServices, total) }}>
          <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-white">
            <strong className="text-[28px] leading-none text-[#202938]">{total}</strong>
            <span className="mt-1 text-xs text-[#A0A8B6]">Total Task</span>
          </div>
        </div>

        <ul aria-label="Legenda task per Internal Service" tabIndex={0} className="max-h-44 w-full max-w-56 space-y-3 overflow-y-auto pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A61919]/20 [scrollbar-color:#CBD2DC_transparent] [scrollbar-width:thin]">
          {internalServices.length === 0 ? <li className="text-center text-sm text-[#98A1B0] sm:text-left">Tidak ada task aktif untuk filter ini.</li> : null}
          {internalServices.map((service) => (
            <li key={service.id} className="grid grid-cols-[12px_1fr_auto] items-center gap-2 text-sm text-[#303846]">
              <span className="size-3 rounded-sm" style={{ backgroundColor: service.color }} />
              <span>{service.label}</span>
              <span className="text-xs text-[#626B78]">{service.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
