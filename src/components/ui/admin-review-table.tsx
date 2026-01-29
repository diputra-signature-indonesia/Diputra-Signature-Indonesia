'use client';

import { deleteReviewAction, setReviewFeaturedAction, setReviewPublishedAction } from '@/app/admin/reviews/action';
import IconAction from '@/icons/BrandIconAction';
import IconApprove from '@/icons/BrandIconApprove';
import IconDelete from '@/icons/BrandIconDelete';
import { UserRole } from '@/types/auth-role';
import type { ReviewActionTable } from '@/types/review-action';
import type { ReviewFeature, ReviewStatus } from '@/types/review-status';
import { Box, CircularProgress, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { useRouter } from 'next/navigation';
import * as React from 'react';

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

  // return boolean dari row:
  getPublished?: (row: T) => boolean; // true => published
  getFeatured?: (row: T) => boolean; // true => featured
};

const can = (role: UserRole | null) => ({
  publish: role === 'super_admin' || role === 'admin' || role === 'editor',
  delete: role === 'super_admin' || role === 'admin',
});

function getAllowedActions(role: UserRole | null, status: ReviewStatus, featured: ReviewFeature): ReviewActionTable[] {
  const p = can(role);
  const actions: ReviewActionTable[] = [];

  if (p.publish && status === 'unpublished') actions.push('publish');
  if (p.publish && status === 'published') actions.push('unpublish');

  if (p.publish && featured === 'unfeatured') actions.push('feature');
  if (p.publish && featured === 'featured') actions.push('unfeature');

  // delete only admin/super, disembunyikan saat published
  if (p.delete && status !== 'published') actions.push('delete');

  return actions;
}

function actionMeta(action: ReviewActionTable) {
  switch (action) {
    case 'publish':
      return { label: 'Publish', icon: <IconApprove className="size-5 text-green-600" /> };
    case 'unpublish':
      return { label: 'Unpublish', icon: <IconApprove className="size-5 text-red-600" /> };
    case 'feature':
      return { label: 'Feature', icon: <IconApprove className="size-5 text-green-600" /> };
    case 'unfeature':
      return { label: 'Unfeature', icon: <IconApprove className="size-5 text-yellow-600" /> };
    case 'delete':
      return { label: 'Delete', icon: <IconDelete className="size-5 text-red-600" /> };
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export function ReviewDataTable<T>({ role, data, columns, getRowKey, getId, getPublished, getFeatured }: DataTableProps<T>) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [activeRowData, setActiveRowData] = React.useState<T | null>(null);
  const menuOpen = Boolean(anchorEl);

  const [activeStatus, setActiveStatus] = React.useState<ReviewStatus>('unpublished');
  const [activeFeatured, setActiveFeatured] = React.useState<ReviewFeature>('unfeatured');

  const [loadingAction, setLoadingAction] = React.useState<ReviewActionTable | null>(null);

  const router = useRouter();

  const openMenu = (e: React.MouseEvent<HTMLElement>, row: T) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
    setActiveRowData(row);

    // snapshot status/featured saat menu dibuka (biar konsisten seperti tabel blog kamu)
    const published = getPublished?.(row) ?? false;
    const featured = getFeatured?.(row) ?? false;
    setActiveStatus(published ? 'published' : 'unpublished');
    setActiveFeatured(featured ? 'featured' : 'unfeatured');
  };

  const closeMenu = () => {
    setAnchorEl(null);
    setActiveRowData(null);
  };

  const handleAction = async (action: ReviewActionTable, row: T) => {
    const id = getId(row);

    try {
      setLoadingAction(action);

      if (action === 'publish') await setReviewPublishedAction(id, true);
      if (action === 'unpublish') await setReviewPublishedAction(id, false);

      if (action === 'feature') await setReviewFeaturedAction(id, true);
      if (action === 'unfeature') await setReviewFeaturedAction(id, false);

      if (action === 'delete') {
        const ok = confirm('Delete this review permanently?');
        if (!ok) return;
        await deleteReviewAction(id);
      }

      closeMenu();
      router.refresh();
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <TableContainer component={Paper} sx={{ borderRadius: '12px', backgroundColor: 'white' }} className="mb-3 w-full rounded-2xl border border-gray-200">
      <Box className="px-5 py-4">
        <h2 className="text-lg font-bold">Client Review</h2>
        <p className="text-base text-gray-500">Review Results Rccording to the Disposable URL</p>
      </Box>
      <Table stickyHeader sx={{ tableLayout: 'fixed' }} className="px-7">
        <TableHead>
          <TableRow>
            {columns.map((col, i) => (
              <TableCell key={i} align={col.align ?? 'left'} sx={{ width: col.width }} className="bg-gray-200 px-3 py-3 text-sm font-semibold">
                <span className="font-bold text-gray-500">{col.header}</span>
              </TableCell>
            ))}
            <TableCell align="center" sx={{ width: '100px' }} className="bg-gray-200 px-3 py-3 text-sm font-semibold">
              Action
            </TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {data.map((row, i) => (
            <TableRow key={getRowKey ? getRowKey(row, i) : i} hover className="text-sm transition-colors duration-200" sx={{ '&:hover': { backgroundColor: 'rgb(209 213 219)' } }}>
              {columns.map((col, j) => (
                <TableCell key={j} align={col.align ?? 'left'} sx={{ width: col.width, verticalAlign: 'top' }} className="px-3 py-5">
                  <span className="font-medium text-gray-500">{col.cell(row)}</span>
                </TableCell>
              ))}

              <TableCell sx={{ verticalAlign: 'top' }} className="px-3 py-4">
                <Box className="flex justify-center">
                  <IconButton size="small" onClick={(e) => openMenu(e, row)} className="hover:bg-gray-200">
                    <IconAction className="size-5" />
                  </IconButton>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Menu DI LUAR table */}
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={closeMenu}
        disableScrollLock
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ className: 'rounded-lg shadow-lg' }}
      >
        {getAllowedActions(role, activeStatus, activeFeatured).map((action) => {
          const meta = actionMeta(action);
          const isLoading = loadingAction === action;

          return (
            <MenuItem
              key={action}
              disabled={isLoading}
              onClick={async () => {
                if (!activeRowData) return;
                // close dulu biar UX enak, lalu action
                closeMenu();
                await handleAction(action, activeRowData);
              }}
              className="flex gap-10 py-4 pl-5 text-sm"
            >
              <ListItemText>
                <span className="truncate py-4 text-sm">{meta.label}</span>
              </ListItemText>

              <ListItemIcon className="flex min-w-0 justify-end">{isLoading ? <CircularProgress size={16} /> : meta.icon}</ListItemIcon>
            </MenuItem>
          );
        })}
      </Menu>
    </TableContainer>
  );
}
