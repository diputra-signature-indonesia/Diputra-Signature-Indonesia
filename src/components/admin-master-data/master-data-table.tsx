import type { MasterDataCategory, MasterDataCell } from '@/data/admin-master-data/master-data-dummy-data';
import { Archive, ArrowUpDown, ListTree, LockKeyhole, Pencil, Workflow } from 'lucide-react';

const badgeStyles: Record<Extract<MasterDataCell, { type: 'badge' }>['tone'], string> = {
  red: 'border-[#F3B9B9] bg-[#FFF0F0] text-[#B51414]',
  yellow: 'border-[#F1D671] bg-[#FFF9E8] text-[#806600]',
  green: 'border-[#A7E2BE] bg-[#EDFBF3] text-[#14864B]',
  blue: 'border-[#AFC5EE] bg-[#EEF4FF] text-[#174DA4]',
  gray: 'border-[#D9DDE3] bg-[#F5F6F8] text-[#68717E]',
  purple: 'border-[#D2C3EC] bg-[#F6F1FF] text-[#6944A1]',
};

function DataCell({ cell }: { cell: MasterDataCell }) {
  if (cell.type === 'badge') {
    return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${badgeStyles[cell.tone]}`}>{cell.value}</span>;
  }

  if (cell.type === 'color') {
    return (
      <span className="inline-flex items-center gap-2 text-xs text-[#4B5563]">
        <span aria-hidden="true" className="size-3 rounded-full ring-2 ring-white shadow-[0_0_0_1px_rgba(15,23,42,0.12)]" style={{ backgroundColor: cell.color }} />
        {cell.value}
      </span>
    );
  }

  if (cell.type === 'steps') {
    return (
      <div className="flex min-w-[310px] flex-wrap items-center gap-1.5">
        {cell.items.map((step, index) => (
          <span key={step} className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#4F5968]">
            <span className="rounded-md border border-[#E0E3E7] bg-[#F7F8FA] px-2 py-1">{step}</span>
            {index < cell.items.length - 1 ? <span aria-hidden="true" className="text-[#B0B7C2]">›</span> : null}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <p className={`${cell.mono ? 'font-mono text-[11px] tracking-[0.02em] text-[#606B79]' : 'text-xs font-medium text-[#2F3744]'}`}>{cell.value}</p>
      {cell.secondary ? <p className="mt-1 max-w-[280px] text-[10px] leading-4 text-[#8A94A3]">{cell.secondary}</p> : null}
    </div>
  );
}

export function MasterDataTable({ category }: { category: MasterDataCategory }) {
  const isSystemStatuses = category.id === 'job-statuses' || category.id === 'task-statuses';

  return (
    <div className="overflow-hidden rounded-xl border border-[#DEE2E7] bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead className="bg-[#FAFBFC]">
            <tr className="border-b border-[#DEE2E7]">
              {category.columns.map((column, index) => (
                <th key={column} scope="col" className={`px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#758094] ${index === 0 ? 'w-[25%]' : ''}`}>
                  <span className="inline-flex items-center gap-1.5">
                    {column}
                    <ArrowUpDown aria-hidden="true" className="size-3 text-[#BCC3CD]" strokeWidth={1.7} />
                  </span>
                </th>
              ))}
              <th scope="col" className="w-28 px-4 py-3.5 text-right text-[10px] font-semibold uppercase tracking-[0.06em] text-[#758094]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {category.rows.map((row) => (
              <tr key={row.id} className="border-b border-[#E7E9ED] transition last:border-b-0 hover:bg-[#FCFCFD]">
                {row.cells.map((cell, index) => (
                  <td key={`${row.id}-${category.columns[index]}`} className="px-4 py-4 align-middle">
                    <DataCell cell={cell} />
                  </td>
                ))}
                <td className="px-4 py-4 align-middle">
                  <div className="flex items-center justify-end gap-1">
                    {category.id === 'workflow-templates' ? (
                      <button type="button" aria-label={`Manage steps for ${row.cells[0].type === 'text' ? row.cells[0].value : 'workflow'}`} title="Manage workflow steps" className="flex size-8 items-center justify-center rounded-lg text-[#6F7D90] transition hover:bg-[#FDEBEB] hover:text-[#8C1010] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/30">
                        <ListTree aria-hidden="true" className="size-4" strokeWidth={1.7} />
                      </button>
                    ) : null}
                    {category.id === 'internal-services' ? (
                      <button type="button" aria-label={`Assign workflow for ${row.cells[0].type === 'text' ? row.cells[0].value : 'service'}`} title="Assign workflow" className="flex size-8 items-center justify-center rounded-lg text-[#6F7D90] transition hover:bg-[#FDEBEB] hover:text-[#8C1010] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/30">
                        <Workflow aria-hidden="true" className="size-4" strokeWidth={1.7} />
                      </button>
                    ) : null}
                    <button type="button" aria-label={`Edit ${row.cells[0].type === 'text' ? row.cells[0].value : 'item'}`} title="Edit" className="flex size-8 items-center justify-center rounded-lg text-[#6F7D90] transition hover:bg-[#FDEBEB] hover:text-[#8C1010] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/30">
                      <Pencil aria-hidden="true" className="size-4" strokeWidth={1.7} />
                    </button>
                    {isSystemStatuses ? (
                      <span className="flex size-8 items-center justify-center text-[#B2BAC5]" title="System status cannot be archived">
                        <LockKeyhole aria-hidden="true" className="size-4" strokeWidth={1.7} />
                      </span>
                    ) : (
                      <button type="button" aria-label={`Archive ${row.cells[0].type === 'text' ? row.cells[0].value : 'item'}`} title="Move to trash" className="flex size-8 items-center justify-center rounded-lg text-[#6F7D90] transition hover:bg-[#FFF0F0] hover:text-[#C32929] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C32929]/25">
                        <Archive aria-hidden="true" className="size-4" strokeWidth={1.7} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
