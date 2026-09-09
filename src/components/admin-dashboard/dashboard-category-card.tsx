import type { TaskCategorySummary } from '@/data/admin-dashboard/dashboard-dummy-data';

function buildConicGradient(categories: TaskCategorySummary[], total: number) {
  let cursor = 0;

  const stops = categories.map((category) => {
    const start = cursor;
    cursor += (category.value / total) * 100;
    return `${category.color} ${start}% ${cursor}%`;
  });

  return `conic-gradient(${stops.join(', ')})`;
}

export function DashboardCategoryCard({ categories }: { categories: TaskCategorySummary[] }) {
  const total = categories.reduce((sum, category) => sum + category.value, 0);

  return (
    <article className="rounded-xl border border-[#DEE2E7] bg-white p-5 shadow-[0_2px_4px_rgba(15,23,42,0.05)] sm:p-6">
      <h2 className="text-xl font-semibold text-[#202938]">Task Berdasarkan Kategori</h2>

      <div className="mt-6 flex flex-col items-center justify-center gap-8 sm:flex-row">
        <div className="relative size-48 shrink-0 rounded-full" style={{ background: buildConicGradient(categories, total) }}>
          <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-white">
            <strong className="text-[28px] leading-none text-[#202938]">{total}</strong>
            <span className="mt-1 text-xs text-[#A0A8B6]">Total Task</span>
          </div>
        </div>

        <ul className="w-full max-w-48 space-y-3">
          {categories.map((category) => (
            <li key={category.label} className="grid grid-cols-[12px_1fr_auto] items-center gap-2 text-sm text-[#303846]">
              <span className="size-3 rounded-sm" style={{ backgroundColor: category.color }} />
              <span>{category.label}</span>
              <span className="text-xs text-[#626B78]">{category.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
