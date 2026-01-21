'use client';
import { deleteReviewAction, setReviewFeaturedAction, setReviewPublishedAction } from '@/app/admin/reviews/action';
import IconAction from '@/icons/BrandIconAction';
import { UserRole } from '@/types/auth-role';
import { ReviewActionTable } from '@/types/review-action';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { ReviewAction } from './admin-review-action';

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
  getStatus?: (row: T) => boolean;
  getFeatured?: (row: T) => boolean;
};

export function ReviewDataTable<T>({ role, data, columns, getStatus, getFeatured, getRowKey, getId }: DataTableProps<T>) {
  const [activeRow, setActiveRow] = React.useState<number | null>(null);
  const [loadingReviewAction, setLoadingReviewAction] = React.useState<ReviewActionTable | null>(null);
  const router = useRouter();

  const handleAction = async (action: ReviewActionTable, row: T) => {
    const id = getId(row);

    try {
      setLoadingReviewAction(action);

      if (action === 'publish') {
        await setReviewPublishedAction(id, true);
      }

      if (action === 'unpublish') {
        await setReviewPublishedAction(id, false);
      }

      if (action === 'feature') {
        await setReviewFeaturedAction(id, true);
      }

      if (action === 'unfeature') {
        await setReviewFeaturedAction(id, false);
      }

      if (action === 'delete') {
        const ok = confirm('Delete this post permanently?');
        if (!ok) return;
        await deleteReviewAction(id);
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
                <ReviewAction
                  role={role}
                  status={getStatus?.(row) ? 'published' : 'unpublished'}
                  featured={getFeatured?.(row) ? 'featured' : 'unfeatured'}
                  loadingAction={loadingReviewAction}
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
