'use client';

import { DataTable, type Column } from '@/components/ui/admin-table';
import type { BlogPost } from '@/lib/supabase/queries';
import type { UserRole } from '@/types/auth-role';

function formatDate(date: string | null | undefined) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const statusClassMap: Record<string, string> = {
  published: 'bg-green-100 text-green-700',
  draft: 'bg-gray-200 text-gray-700',
  pending: 'bg-yellow-100 text-yellow-700',
  reject: 'bg-red-100 text-red-700',
};

const columns = [
  { header: 'Title', width: '400px', align: 'center', cell: (row) => row.title },
  { header: 'Excerpt / Short Description', width: 'auto', align: 'left', cell: (row) => row.excerpt },
  {
    header: 'Status',
    width: '140px',
    align: 'center',
    cell: (row) => <span className={`rounded-full px-3 py-1 text-xs ${statusClassMap[row.status || ''] ?? 'bg-gray-100 text-gray-600'}`}>{row.status}</span>,
  },
  { header: 'Created', width: '140px', align: 'center', cell: (row) => formatDate(row.created_at) },
  { header: 'Updated', width: '140px', align: 'center', cell: (row) => formatDate(row.updated_at) },
] satisfies Column<BlogPost>[];

export function AdminBlogTableClient({ data, role }: { data: BlogPost[]; role: UserRole | null }) {
  return <DataTable role={role} data={data} columns={columns} getStatus={(row) => row.status ?? 'draft'} getRowKey={(row) => row.id ?? row.slug} getId={(row) => row.id} getSlug={(row) => row.slug} />;
}
