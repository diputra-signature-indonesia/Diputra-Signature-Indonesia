'use client';

import { deleteBlogAction, setBlogStatusAction } from '@/app/admin/action';
import IconAction from '@/icons/BrandIconAction';
import type { UserRole } from '@/types/auth-role';
import type { Action } from '@/types/blog-action';
import type { Status } from '@/types/blog-status';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import IconApprove from '@/icons/BrandIconApprove';
import IconDelete from '@/icons/BrandIconDelete';
import IconEdit from '@/icons/BrandIconEdit';
import IconPreview from '@/icons/BrandIconPreview';
import { Box, CircularProgress, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow } from '@mui/material';

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
  pagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
    pageSizeOptions?: number[];
    basePath: string;
  };
};

const can = (role: UserRole | null) => ({
  approve: role === 'super_admin' || role === 'admin',
  edit: role === 'super_admin' || role === 'admin' || role === 'editor',
  delete: role === 'super_admin' || role === 'admin',
});

function getAllowedActions(role: UserRole | null, status: Status): Action[] {
  const p = can(role);
  const actions: Action[] = ['preview'];

  if (p.edit) actions.push('edit');

  if ((p.edit || p.approve) && status === 'draft') actions.push('toPending');
  if ((p.edit || p.approve) && status === 'pending') actions.push('toDraft');

  if (p.approve && status === 'pending') actions.push('approve', 'reject');
  if (p.approve && status === 'published') actions.push('unpublish');

  if (p.delete && status !== 'published') actions.push('delete');

  return actions;
}

function actionMeta(action: Action) {
  switch (action) {
    case 'approve':
      return { label: 'Approve', icon: <IconApprove className="size-5 text-green-600" /> };
    case 'reject':
      return { label: 'Reject', icon: <IconApprove className="size-5 text-red-600" /> };
    case 'toPending':
      return { label: 'Ready', icon: <IconApprove className="size-5 text-green-600" /> };
    case 'toDraft':
      return { label: 'Draft', icon: <IconApprove className="size-5 text-yellow-600" /> };
    case 'unpublish':
      return { label: 'Unpublish', icon: <IconApprove className="size-5 text-yellow-600" /> };
    case 'preview':
      return { label: 'Preview', icon: <IconPreview className="size-5 text-blue-600" /> };
    case 'edit':
      return { label: 'Edit', icon: <IconEdit className="size-5 text-yellow-600" /> };
    case 'delete':
      return { label: 'Delete', icon: <IconDelete className="size-5 text-red-600" /> };
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export function DataTable<T>({ role, data, columns, getStatus, getRowKey, getId, getSlug, pagination }: DataTableProps<T>) {
  const [activeStatus, setActiveStatus] = React.useState<Status>('draft');
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [activeRowData, setActiveRowData] = React.useState<T | null>(null);
  const menuOpen = Boolean(anchorEl);

  const [loadingAction, setLoadingAction] = React.useState<Action | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const pushParams = (nextPage: number, nextPageSize: number) => {
    if (!pagination) return;
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('page', String(nextPage));
    sp.set('pageSize', String(nextPageSize));
    router.push(`${pagination.basePath}?${sp.toString()}`);
  };

  const openMenu = (e: React.MouseEvent<HTMLElement>, row: T) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
    setActiveRowData(row);
    setActiveStatus(getStatus?.(row) ?? 'draft');
  };

  const closeMenu = () => {
    setAnchorEl(null);
    setActiveRowData(null);
    // setActiveStatus('draft');
  };

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
        router.push(`/admin/blog/preview/${getSlug(row)}`);
        return;
      }

      if (action === 'edit') {
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

      closeMenu();
      router.refresh();
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <TableContainer component={Paper} className="w-full">
      <Table
        stickyHeader
        sx={{
          tableLayout: 'fixed',
        }}
      >
        <TableHead>
          <TableRow>
            {columns.map((col, i) => (
              <TableCell key={i} align={col.align ?? 'left'} sx={{ width: col.width }} className="bg-gray-200 px-3 py-3 text-sm font-semibold">
                {col.header}
              </TableCell>
            ))}

            <TableCell align="center" sx={{ width: '100px' }} className="bg-gray-200 px-3 py-3 text-sm font-semibold">
              Action
            </TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {data.map((row, i) => (
            <TableRow
              key={getRowKey ? getRowKey(row, i) : i}
              hover
              className="text-sm transition-colors duration-200"
              sx={{
                '&:hover': { backgroundColor: 'rgb(209 213 219)' },
              }}
            >
              {columns.map((col, j) => (
                <TableCell key={j} align={col.align ?? 'left'} sx={{ width: col.width, verticalAlign: 'top' }} className="px-3 py-5">
                  {col.cell(row)}
                </TableCell>
              ))}

              {/* ACTION COLUMN */}
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

      {pagination && (
        <TablePagination
          component="div"
          count={pagination.totalCount}
          page={pagination.page}
          onPageChange={(_, newPage) => pushParams(newPage, pagination.pageSize)}
          rowsPerPage={pagination.pageSize}
          onRowsPerPageChange={(e) => {
            const newSize = parseInt(e.target.value, 10);
            pushParams(0, newSize);
          }}
          rowsPerPageOptions={pagination.pageSizeOptions ?? [5, 10, 25, 50]}
        />
      )}

      {/* Menu taruh DI LUAR Table biar tidak ganggu layout table */}
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={closeMenu}
        disableScrollLock
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ className: 'rounded-lg shadow-lg' }}
      >
        {getAllowedActions(role, activeStatus).map((action) => {
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
