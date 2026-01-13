'use client';
import * as React from 'react';
import { BlogAction } from './admin-blog-action';
import IconAction from '@/icons/BrandIconAction';
import { UserRole } from '@/types/auth-role';
import { Action } from '@/types/blog-action';
import { deleteBlogAction, setBlogStatusAction } from '@/app/admin/action';
import { useRouter } from 'next/navigation';
import { Status } from '@/types/blog-status';

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
  getSlug: (row: T) => string;
  getStatus?: (row: T) => Status;
};

export function DataTable<T>({ role, data, columns, getStatus, getRowKey, getId, getSlug }: DataTableProps<T>) {
  const [activeRow, setActiveRow] = React.useState<number | null>(null);
  const [loadingAction, setLoadingAction] = React.useState<Action | null>(null);
  const router = useRouter();

  const handleAction = async (action: Action, row: T) => {
    const id = getId(row);

    try {
      setLoadingAction(action);

      if (action === 'approve') {
        await setBlogStatusAction(id, 'published');
      }

      if (action === 'reject') {
        const ok = confirm('Reject this post?');
        if (!ok) return;
        await setBlogStatusAction(id, 'reject');
      }

      if (action === 'toPending') {
        await setBlogStatusAction(id, 'pending');
      }

      if (action === 'toDraft') {
        await setBlogStatusAction(id, 'draft');
      }

      if (action === 'preview') {
        setActiveRow(null);
        router.push(`/admin/blog/preview/${getSlug(row)}`);
        return;
      }

      if (action === 'edit') {
        setActiveRow(null);
        router.push(`/admin/blog/${getSlug(row)}/edit`);
        return;
      }

      if (action === 'delete') {
        const ok = confirm('Delete this post permanently?');
        if (!ok) return;
        await deleteBlogAction(id);
      }

      if (action === 'unpublish') {
        const ok = confirm('Unpublish this post? It will be hidden from the public site.');
        if (!ok) return;
        await setBlogStatusAction(id, 'draft');
      }

      setActiveRow(null);
      router.refresh();
    } finally {
      setLoadingAction(null);
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

              {activeRow === i && <BlogAction role={role} status={getStatus?.(row) ?? 'draft'} loadingAction={loadingAction} onAction={(action) => handleAction(action, row)} />}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
