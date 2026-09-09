import type { DashboardMetric, DashboardMetricIcon, DashboardMetricTone } from '@/data/admin-dashboard/dashboard-dummy-data';
import { CalendarClock, CheckCircle2, CirclePause, Clock3, ClipboardList, RefreshCw, TriangleAlert } from 'lucide-react';

const metricIcons: Record<DashboardMetricIcon, React.ElementType> = {
  active: ClipboardList,
  'not-started': Clock3,
  'in-progress': RefreshCw,
  delayed: CirclePause,
  completed: CheckCircle2,
  'near-deadline': TriangleAlert,
  'due-today': CalendarClock,
  overdue: CalendarClock,
};

const toneClasses: Record<DashboardMetricTone, string> = {
  brand: 'bg-[#FDE7E7] text-[#A61919]',
  neutral: 'bg-[#F3F5F7] text-[#97A2B2]',
  yellow: 'bg-[#FFE680] text-[#9C7D00]',
  red: 'bg-[#FFE0E0] text-[#E33434]',
  green: 'bg-[#DDF8E8] text-[#14A45A]',
};

export function DashboardStatCards({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    <section aria-label="Task summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metricIcons[metric.icon];

        return (
          <article key={metric.label} className="rounded-xl border border-[#DEE2E7] bg-white px-4 py-4 shadow-[0_2px_4px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-2">
              <span className={`flex size-6 items-center justify-center rounded-full ${toneClasses[metric.tone]}`}>
                <Icon aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
              </span>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#9AA4B4]">{metric.label}</h2>
            </div>
            <p className="mt-2 text-[28px] font-semibold leading-none text-[#202938]">{metric.value}</p>
          </article>
        );
      })}
    </section>
  );
}
