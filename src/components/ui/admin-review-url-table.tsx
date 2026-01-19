'use client';
import { deleteReviewRequestAction, revokeReviewRequestAction } from '@/app/admin/reviews/action';
import IconAction from '@/icons/BrandIconAction';
import { UserRole } from '@/types/auth-role';
import { UrlActionTable } from '@/types/review-action';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { ReviewUrlAction } from './admin-review-url-action';

export type Column<T> = {
  header: string;
  cell: (row: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
};

export type DataTableProps<T> = {
  role: UserRole | null;
  data: T[];
  columns: Column<T>[];
  getRowKey?: (row: T, index: number) => string;
  getId: (row: T) => string;
  getIsUsed?: (row: T) => boolean;
  getIsRevoked?: (row: T) => boolean;
  getIsExpired?: (row: T) => boolean;
};

export function ReviewUrlDataTable<T>({ role, data, columns, getRowKey, getId, getIsUsed, getIsRevoked, getIsExpired }: DataTableProps<T>) {
  const [activeRow, setActiveRow] = React.useState<number | null>(null);
  const [loadingReviewAction, setLoadingReviewAction] = React.useState<UrlActionTable | null>(null);
  const router = useRouter();

  const handleAction = async (action: UrlActionTable, row: T) => {
    const id = getId(row);

    try {
      setLoadingReviewAction(action);

      if (action === 'revoke') {
        const ok = confirm('Revoke this link? It will no longer be usable.');
        if (!ok) return;
        await revokeReviewRequestAction(id);
      }

      if (action === 'delete') {
        const ok = confirm('Delete this generated link permanently?');
        if (!ok) return;
        await deleteReviewRequestAction(id);
      }

      setActiveRow(null);
      router.refresh();
    } finally {
      setLoadingReviewAction(null);
    }
  };

  return (
    <table className="w-full table-fixed">
      <thead className="bg-gray-200">
        <tr>
          {columns.map((col, i) => (
            <th key={i} style={{ width: col.width, textAlign: col.align }} className="px-3 py-3 text-sm font-semibold">
              {col.header}
            </th>
          ))}
          <th style={{ width: '100px', textAlign: 'center' }} className="px-3 py-3 text-sm font-semibold">
            Action
          </th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={getRowKey ? getRowKey(row, i) : i} className="py-3 text-sm transition-colors duration-200 hover:bg-gray-300">
            {columns.map((col, j) => (
              <td key={j} style={{ width: col.width, textAlign: col.align }} className="px-3 py-5 align-top">
                {col.cell(row)}
              </td>
            ))}

            {/* ACTION COLUMN */}
            <td className="relative flex px-3 py-4 align-top">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveRow(activeRow === i ? null : i);
                }}
                className="mx-auto cursor-pointer rounded px-2 py-1 hover:bg-gray-200"
              >
                <IconAction className="size-5" />
              </button>

              {activeRow === i && (
                <ReviewUrlAction
                  role={role}
                  loadingAction={loadingReviewAction}
                  isUsed={getIsUsed?.(row) ?? false}
                  isRevoked={getIsRevoked?.(row) ?? false}
                  isExpired={getIsExpired?.(row) ?? false}
                  onAction={(action) => handleAction(action, row)}
                />
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
