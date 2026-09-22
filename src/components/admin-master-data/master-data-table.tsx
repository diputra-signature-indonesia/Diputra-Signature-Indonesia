import type { MasterDataCategory, MasterDataCell, MasterDataRow } from '@/data/admin-master-data/master-data';
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
        <span aria-hidden="true" className="size-3 rounded-full shadow-[0_0_0_1px_rgba(15,23,42,0.12)] ring-2 ring-white" style={{ backgroundColor: cell.color }} />
        {cell.value}
      </span>
    );
  }

  if (cell.type === 'steps') {
    return (
      <div className="flex min-w-[310px] flex-wrap items-center gap-1.5">
        {cell.items.map((step, index) => (
          <span key={`${step}-${index}`} className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#4F5968]">
            <span className="rounded-md border border-[#E0E3E7] bg-[#F7F8FA] px-2 py-1">{step}</span>
            {index < cell.items.length - 1 ? (
              <span aria-hidden="true" className="text-[#B0B7C2]">
                &rsaquo;
              </span>
            ) : null}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <p className={cell.mono ? 'font-mono text-[11px] tracking-[0.02em] text-[#606B79]' : 'text-xs font-medium text-[#2F3744]'}>{cell.value}</p>
      {cell.secondary ? <p className="mt-1 max-w-[280px] text-[10px] leading-4 text-[#8A94A3]">{cell.secondary}</p> : null}
    </div>
  );
}

type MasterDataTableProps = {
  category: MasterDataCategory;
  canManage: boolean;
  pendingRowId?: string | null;
  onEdit?: (row: MasterDataRow) => void;
  onArchive?: (row: MasterDataRow) => void;
};

function rowLabel(row: MasterDataRow) {
  const firstCell = row.cells[0];
  return firstCell?.type === 'text' ? firstCell.value : 'item';
}

export function MasterDataTable({ category, canManage, pendingRowId, onEdit, onArchive }: MasterDataTableProps) {
  const readOnlyCategory = category.id === 'service-categories';

  return (
    <div className="overflow-hidden rounded-xl border border-[#DEE2E7] bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead className="bg-[#FAFBFC]">
            <tr className="border-b border-[#DEE2E7]">
              {category.columns.map((column, index) => (
                <th key={column} scope="col" className={`px-4 py-3.5 text-[10px] font-semibold tracking-[0.06em] text-[#758094] uppercase ${index === 0 ? 'w-[25%]' : ''}`}>
                  <span className="inline-flex items-center gap-1.5">
                    {column}
                    <ArrowUpDown aria-hidden="true" className="size-3 text-[#BCC3CD]" strokeWidth={1.7} />
                  </span>
                </th>
              ))}
              <th scope="col" className="w-28 px-4 py-3.5 text-right text-[10px] font-semibold tracking-[0.06em] text-[#758094] uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {category.rows.length === 0 ? (
              <tr>
                <td colSpan={category.columns.length + 1} className="px-6 py-14 text-center text-xs text-[#8A94A3]">
                  No data is available in this category yet.
                </td>
              </tr>
            ) : null}
            {category.rows.map((row) => {
              const label = rowLabel(row);
              const isPending = pendingRowId === row.id;
              const editDisabled = readOnlyCategory || !canManage || !onEdit || isPending;
              const archiveDisabled = readOnlyCategory || !canManage || !onArchive || row.isSystem || !row.isActive || isPending;

              return (
                <tr key={row.id} className="border-b border-[#E7E9ED] transition last:border-b-0 hover:bg-[#FCFCFD]">
                  {row.cells.map((cell, index) => (
                    <td key={`${row.id}-${category.columns[index]}`} className="px-4 py-4 align-middle">
                      <DataCell cell={cell} />
                    </td>
                  ))}
                  <td className="px-4 py-4 align-middle">
                    <div className="flex items-center justify-end gap-1">
                      {category.id === 'workflow-templates' ? (
                        <button
                          type="button"
                          onClick={() => onEdit?.(row)}
                          disabled={editDisabled}
                          aria-label={`Manage steps for ${label}`}
                          title={editDisabled ? 'Only admin and super admin can manage workflow steps' : 'Manage workflow steps'}
                          className="flex size-8 items-center justify-center rounded-lg text-[#6F7D90] transition hover:bg-[#FDEBEB] hover:text-[#8C1010] focus-visible:ring-2 focus-visible:ring-[#8C1010]/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-[#6F7D90]"
                        >
                          <ListTree aria-hidden="true" className="size-4" strokeWidth={1.7} />
                        </button>
                      ) : null}
                      {category.id === 'internal-services' ? (
                        <button
                          type="button"
                          onClick={() => onEdit?.(row)}
                          disabled={editDisabled}
                          aria-label={`Assign workflow for ${label}`}
                          title={editDisabled ? 'Only admin and super admin can assign workflows' : 'Assign workflow'}
                          className="flex size-8 items-center justify-center rounded-lg text-[#6F7D90] transition hover:bg-[#FDEBEB] hover:text-[#8C1010] focus-visible:ring-2 focus-visible:ring-[#8C1010]/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-[#6F7D90]"
                        >
                          <Workflow aria-hidden="true" className="size-4" strokeWidth={1.7} />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => onEdit?.(row)}
                        disabled={editDisabled}
                        aria-label={`Edit ${label}`}
                        title={readOnlyCategory ? 'Service Categories are read-only here' : canManage ? 'Edit' : 'Only admin and super admin can edit'}
                        className="flex size-8 items-center justify-center rounded-lg text-[#6F7D90] transition hover:bg-[#FDEBEB] hover:text-[#8C1010] focus-visible:ring-2 focus-visible:ring-[#8C1010]/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-[#6F7D90]"
                      >
                        <Pencil aria-hidden="true" className="size-4" strokeWidth={1.7} />
                      </button>
                      {row.isSystem ? (
                        <span className="flex size-8 items-center justify-center text-[#B2BAC5]" title="System data must remain active">
                          <LockKeyhole aria-hidden="true" className="size-4" strokeWidth={1.7} />
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onArchive?.(row)}
                          disabled={archiveDisabled}
                          aria-label={`Deactivate ${label}`}
                          title={
                            readOnlyCategory ? 'Service Categories are read-only here' : !row.isActive ? 'Already inactive' : canManage ? 'Deactivate' : 'Only admin and super admin can deactivate'
                          }
                          className="flex size-8 items-center justify-center rounded-lg text-[#6F7D90] transition hover:bg-[#FFF0F0] hover:text-[#C32929] focus-visible:ring-2 focus-visible:ring-[#C32929]/25 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-[#6F7D90]"
                        >
                          <Archive aria-hidden="true" className="size-4" strokeWidth={1.7} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
