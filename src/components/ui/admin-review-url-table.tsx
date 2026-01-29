'use client';
import { deleteReviewRequestAction, revokeReviewRequestAction } from '@/app/admin/reviews/action';
import IconAction from '@/icons/BrandIconAction';
import IconApprove from '@/icons/BrandIconApprove';
import { UserRole } from '@/types/auth-role';
import { UrlActionTable } from '@/types/review-action';
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
  getIsUsed?: (row: T) => boolean;
  getIsRevoked?: (row: T) => boolean;
  getIsExpired?: (row: T) => boolean;
};

const can = (role: UserRole | null) => ({
  manage: role === 'super_admin' || role === 'admin' || role === 'editor',
  delete: role === 'super_admin' || role === 'admin',
});

function getAllowedActions(role: UserRole | null, isUsed: boolean, isRevoked: boolean, isExpired: boolean): UrlActionTable[] {
  const p = can(role);
  const actions: UrlActionTable[] = [];
  // Revoke hanya masuk akal kalau masih aktif (belum used & belum revoked)
  if (p.manage && !isUsed && !isRevoked && !isExpired) actions.push('revoke');
  // Delete: biasanya admin only; boleh hapus kalau sudah used/expired/revoked (housekeeping)
  if (p.delete) actions.push('delete');
  return actions;
}

function actionMeta(action: UrlActionTable) {
  switch (action) {
    case 'revoke':
      return { label: 'Revoke', icon: <IconApprove className="size-5 text-green-600" /> };
    case 'delete':
      return { label: 'Delete', icon: <IconApprove className="size-5 text-red-600" /> };
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export function ReviewUrlDataTable<T>({ role, data, columns, getRowKey, getId, getIsUsed, getIsRevoked, getIsExpired }: DataTableProps<T>) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [activeRowData, setActiveRowData] = React.useState<T | null>(null);
  const menuOpen = Boolean(anchorEl);

  const [loadingReviewAction, setLoadingReviewAction] = React.useState<UrlActionTable | null>(null);
  const router = useRouter();

  const isUsed = activeRowData ? (getIsUsed?.(activeRowData) ?? false) : false;
  const isRevoked = activeRowData ? (getIsRevoked?.(activeRowData) ?? false) : false;
  const isExpired = activeRowData ? (getIsExpired?.(activeRowData) ?? false) : false;

  const allowedActions = activeRowData ? getAllowedActions(role, isUsed, isRevoked, isExpired) : [];

  const openMenu = (e: React.MouseEvent<HTMLElement>, row: T) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
    setActiveRowData(row);
  };

  const closeMenu = () => {
    setAnchorEl(null);
    setActiveRowData(null);
  };

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

      router.refresh();
    } finally {
      setLoadingReviewAction(null);
    }
  };

  return (
    <TableContainer component={Paper} sx={{ borderRadius: '12px', backgroundColor: 'white' }} className="mb-3 w-full rounded-2xl border border-gray-200">
      <Box className="px-5 py-4">
        <h2 className="text-lg font-bold">Generated URL</h2>
        <p className="text-base text-gray-500">Latest Created Review URL</p>
      </Box>
      <Table stickyHeader sx={{ tableLayout: 'fixed' }} className="px-7">
        <TableHead>
          <TableRow>
            {columns.map((col, i) => (
              <TableCell key={i} align={col.align ?? 'left'} sx={{ width: col.width }} className="bg-gray-200 px-3 py-3 text-sm">
                <span className="font-bold text-gray-500">{col.header}</span>
              </TableCell>
            ))}
            <TableCell align="center" sx={{ width: '100px' }} className="bg-gray-200 px-3 py-3 text-sm">
              <span className="font-bold text-gray-500">Action</span>
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
                '&:hover': {
                  backgroundColor: 'rgb(209 213 219)',
                },
              }}
            >
              {columns.map((col, j) => (
                <TableCell key={j} align={col.align ?? 'left'} sx={{ width: col.width, verticalAlign: 'top' }} className="px-3 py-5">
                  <span className="font-medium text-gray-500">{col.cell(row)}</span>
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

      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={closeMenu}
        disableScrollLock
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ className: 'rounded-lg shadow-lg' }}
      >
        {allowedActions.map((action) => {
          const meta = actionMeta(action);
          const isLoading = loadingReviewAction === action;
          return (
            <MenuItem
              key={action}
              disabled={isLoading}
              onClick={async () => {
                if (!activeRowData) return;
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
