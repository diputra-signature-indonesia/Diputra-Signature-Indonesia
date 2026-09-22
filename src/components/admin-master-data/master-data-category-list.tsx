import type { MasterDataCategory, MasterDataIconName } from '@/data/admin-master-data/master-data';
import { BriefcaseBusiness, Flag, ListChecks, Shapes, Workflow, WorkflowIcon } from 'lucide-react';

const categoryIcons: Record<MasterDataIconName, React.ElementType> = {
  priority: Flag,
  category: Shapes,
  service: BriefcaseBusiness,
  'job-status': WorkflowIcon,
  'task-status': ListChecks,
  workflow: Workflow,
};

type MasterDataCategoryListProps = {
  categories: MasterDataCategory[];
  selectedId: MasterDataCategory['id'];
  onSelect: (id: MasterDataCategory['id']) => void;
};

export function MasterDataCategoryList({ categories, selectedId, onSelect }: MasterDataCategoryListProps) {
  return (
    <aside className="border-b border-[#DEE2E7] bg-[#FBFCFD] lg:border-r lg:border-b-0">
      <div className="px-4 pt-5 pb-3 lg:px-5 lg:pt-6">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-[#9AA4B4] uppercase">Select Data</p>
        <p className="mt-1 text-xs leading-5 text-[#707988]">Choose a category to manage.</p>
      </div>

      <nav aria-label="Master data categories" className="flex gap-2 overflow-x-auto px-4 pb-4 lg:flex-col lg:gap-1 lg:px-3 lg:pb-6">
        {categories.map((category) => {
          const Icon = categoryIcons[category.icon];
          const active = category.id === selectedId;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelect(category.id)}
              aria-current={active ? 'page' : undefined}
              className={`group flex min-w-max items-center gap-3 rounded-lg px-3 py-2.5 text-left transition focus-visible:ring-2 focus-visible:ring-[#8C1010]/30 focus-visible:outline-none lg:w-full lg:min-w-0 ${
                active ? 'bg-[#FDEBEB] text-[#8C1010]' : 'text-[#394150] hover:bg-white hover:text-[#8C1010]'
              }`}
            >
              <Icon aria-hidden="true" className="size-[18px] shrink-0" strokeWidth={1.7} />
              <span className="min-w-0 flex-1 text-xs font-semibold tracking-[0.01em] lg:truncate">{category.label}</span>
              <span
                className={`flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${
                  active ? 'bg-white text-[#8C1010]' : 'bg-[#F1F3F5] text-[#7A8492] group-hover:bg-[#FFF4F3]'
                }`}
              >
                {category.rows.length}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
