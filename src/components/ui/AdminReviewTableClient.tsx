'use client';

import { type Column } from '@/components/ui/admin-table';
import type { DefaultReview } from '@/lib/supabase/queries';
import type { UserRole } from '@/types/auth-role';
import { ReviewDataTable } from './admin-review-table';

function formatDate(date: string | null | undefined) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const statusClassMap: Record<string, string> = {
  Published: 'bg-green-100 text-green-700',
  Unpublished: 'bg-red-100 text-red-700',
};
const featureClassMap: Record<string, string> = {
  Featured: 'bg-green-100 text-green-700',
  Unfeatured: 'bg-red-100 text-red-700',
};

const columns = [
  { header: 'Reviewer Name', width: '200px', align: 'center', cell: (row) => row.name },
  { header: 'Email', width: '200px', align: 'center', cell: (row) => row.email },
  { header: 'Message', width: 'auto', align: 'left', cell: (row) => row.message },
  {
    header: 'Status',
    width: '140px',
    align: 'center',
    cell: (row) => (
      <span className={`rounded-full px-3 py-1 text-xs ${statusClassMap[row.is_published ? 'Published' : 'Unpublished'] ?? 'bg-gray-100 text-gray-600'}`}>
        {row.is_published ? 'Published' : 'Unpublished'}
      </span>
    ),
  },
  {
    header: 'Feature',
    width: '140px',
    align: 'center',
    cell: (row) => (
      <span className={`rounded-full px-3 py-1 text-xs ${featureClassMap[row.is_featured ? 'Featured' : 'Unfeatured'] ?? 'bg-gray-100 text-gray-600'}`}>
        {row.is_featured ? 'Featured' : 'Unfeatured'}
      </span>
    ),
  },
  { header: 'Created', width: '140px', align: 'center', cell: (row) => formatDate(row.created_at) },
] satisfies Column<DefaultReview>[];

export function AdminReviewTableClient({ data, role }: { data: DefaultReview[]; role: UserRole | null }) {
  return <ReviewDataTable role={role} data={data} columns={columns} getStatus={(row) => row.is_published} getFeatured={(row) => row.is_featured} getRowKey={(row) => row.id} getId={(row) => row.id} />;
}
