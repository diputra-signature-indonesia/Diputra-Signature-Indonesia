/*
This is Unused Action Component for Blog Action 
*/

'use client';
import IconApprove from '@/icons/BrandIconApprove';
import IconDelete from '@/icons/BrandIconDelete';
import IconEdit from '@/icons/BrandIconEdit';
import IconPreview from '@/icons/BrandIconPreview';
import { UserRole } from '@/types/auth-role';
import { Action } from '@/types/blog-action';
import { Status } from '@/types/blog-status';

type BlogActionProps = {
  role: UserRole | null;
  status: Status;
  onAction: (action: Action) => void;
  loadingAction?: Action | null; // optional buat loading UI
};

const can = (role: UserRole | null) => ({
  approve: role === 'super_admin' || role === 'admin',
  edit: role === 'super_admin' || role === 'admin' || role === 'editor',
  delete: role === 'super_admin' || role === 'admin',
});

function getAllowedActions(role: UserRole | null, status: Status): Action[] {
  const p = can(role);
  const actions: Action[] = ['preview']; // always

  if (p.edit) actions.push('edit');

  // editor/admin can move draft<->pending
  if ((p.edit || p.approve) && status === 'draft') actions.push('toPending');
  if ((p.edit || p.approve) && status === 'pending') actions.push('toDraft');

  // admin/super only, and only when pending
  if (p.approve && status === 'pending') actions.push('approve', 'reject');
  if (p.approve && status === 'published') actions.push('unpublish');

  // delete only admin/super (optional: hide when published)
  if (p.delete && status !== 'published') actions.push('delete');

  return actions;
}

export function BlogAction({ role, status, onAction, loadingAction }: BlogActionProps) {
  const actions = getAllowedActions(role, status);

  const btn = (action: Action) => {
    const isLoading = loadingAction === action;

    const common = `flex w-full items-center justify-between gap-2 px-5 py-4 text-sm hover:bg-gray-100 ${isLoading ? 'opacity-60 pointer-events-none' : ''}`;

    switch (action) {
      case 'approve':
        return (
          <button key={action} onClick={() => onAction('approve')} className={common}>
            Approve <IconApprove className="size-5 text-green-600" />
          </button>
        );
      case 'reject':
        return (
          <button key={action} onClick={() => onAction('reject')} className={common}>
            Reject <IconApprove className="size-5 text-red-600" />
          </button>
        );
      case 'toPending':
        return (
          <button key={action} onClick={() => onAction('toPending')} className={common}>
            Ready <IconApprove className="size-5 text-green-600" />
          </button>
        );
      case 'toDraft':
        return (
          <button key={action} onClick={() => onAction('toDraft')} className={common}>
            Draft <IconApprove className="size-5 text-yellow-600" />
          </button>
        );
      case 'unpublish':
        return (
          <button key={action} onClick={() => onAction('toDraft')} className={common}>
            Unpublish <IconApprove className="size-5 text-yellow-600" />
          </button>
        );
      case 'preview':
        return (
          <button key={action} onClick={() => onAction('preview')} className={common}>
            Preview <IconPreview className="size-5 text-blue-600" />
          </button>
        );
      case 'edit':
        return (
          <button key={action} onClick={() => onAction('edit')} className={common}>
            Edit <IconEdit className="size-5 text-yellow-600" />
          </button>
        );
      case 'delete':
        return (
          <button key={action} onClick={() => onAction('delete')} className={common}>
            Delete <IconDelete className="size-5 text-red-600" />
          </button>
        );
    }
  };

  return <div className="absolute top-12 right-10 z-50 w-52 overflow-hidden rounded-l-md rounded-b-md bg-white shadow-lg">{actions.map(btn)}</div>;
}
