import { DataTable, type Column } from '@/components/ui/admin-table';
import type { ContentItem } from '@/types/dummy-table-type';
import { CONTENT_ITEMS } from '@/data/dummy-table-data';
import { BrandButton } from '@/components/ui/button';
import Link from 'next/link';

export function formatDate(date: string | null) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const columns = [
  { header: 'ID', width: '100px', cell: (row) => row.id },
  { header: 'Title', width: 'auto', cell: (row) => row.title },
  { header: 'Category', width: '140px', align: 'center', cell: (row) => row.category },
  {
    header: 'Status',
    width: '120px',
    align: 'center',
    cell: (row) => <span className="rounded-full bg-gray-200 px-3 py-1 text-xs">{row.status}</span>,
  },
  { header: 'Created At', width: '140px', align: 'center', cell: (row) => formatDate(row.createdAt) },
  { header: 'Published At', width: '140px', align: 'center', cell: (row) => formatDate(row.publishedAt) },
] satisfies Column<ContentItem>[];

export default function Page() {
  return (
    <div className="h-full px-4 py-6">
      <div className="brand-h1-mb flex items-center justify-between">
        <h1 className="brand-h1 font-bold">Blog List</h1>
        <div>
          <BrandButton asChild variant="red" className="w-full justify-center max-sm:px-0 sm:w-fit">
            <Link href="/blog/create">New Post</Link>
          </BrandButton>
        </div>
      </div>
      <DataTable data={CONTENT_ITEMS} columns={columns} getRowKey={(row) => row.id} />
    </div>
  );
}
