'use client';

import { type Column } from '@/components/ui/admin-table';
import type { DefaultGeneratedUrl } from '@/lib/supabase/queries';
import type { UserRole } from '@/types/auth-role';
import { ReviewUrlDataTable } from './admin-review-url-table';

function formatDate(date: string | null | undefined) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const columns = [
  { header: 'Client Name', width: '200px', align: 'center', cell: (row) => row.client_name },
  { header: 'Client Email', width: '200px', align: 'center', cell: (row) => row.client_email },
  {
    header: 'Expires At',
    width: '140px',
    align: 'center',
    cell: (row) => formatDate(row.expires_at),
  },
  {
    header: 'Used At',
    width: '140px',
    align: 'center',
    cell: (row) => formatDate(row.used_at),
  },
  {
    header: 'Revoked At',
    width: '140px',
    align: 'center',
    cell: (row) => formatDate(row.revoked_at),
  },

  { header: 'Created', width: '140px', align: 'center', cell: (row) => formatDate(row.created_at) },
] satisfies Column<DefaultGeneratedUrl>[];

export function AdminReviewUrlTableClient({ data, role }: { data: DefaultGeneratedUrl[]; role: UserRole | null }) {
  return (
    <div className="w-full overflow-x-scroll">
      <ReviewUrlDataTable role={role} data={data} columns={columns} getRowKey={(row) => row.id} getId={(row) => row.id} />
    </div>
  );
}
