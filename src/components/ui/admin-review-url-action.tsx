'use client';
import IconApprove from '@/icons/BrandIconApprove';
import { UserRole } from '@/types/auth-role';
import type { UrlActionTable } from '@/types/review-action';

type ReviewUrlActionProps = {
  role: UserRole | null;
  onAction: (action: UrlActionTable) => void;
  loadingAction?: UrlActionTable | null; // optional buat loading UI
};

const can = (role: UserRole | null) => ({
  publish: role === 'super_admin' || role === 'admin' || role === 'editor',
  delete: role === 'super_admin' || role === 'admin',
});

function getAllowedActions(role: UserRole | null): UrlActionTable[] {
  const p = can(role);
  const actions: UrlActionTable[] = []; // always

  // editor/admin can move draft<->pending
  // if (p.publish && status === 'unpublished') actions.push('publish');
  // if (p.publish && status === 'published') actions.push('unpublish');

  return actions;
}

export function ReviewUrlAction({ role, onAction, loadingAction }: ReviewUrlActionProps) {
  const actions = getAllowedActions(role);

  const btn = (action: UrlActionTable) => {
    const isLoading = loadingAction === action;

    const common = `flex w-full items-center justify-between gap-2 px-5 py-4 text-sm hover:bg-gray-100 ${isLoading ? 'opacity-60 pointer-events-none' : ''}`;

    switch (action) {
      case 'revoke':
        return (
          <button key={action} onClick={() => onAction('revoke')} className={common}>
            Revoke <IconApprove className="size-5 text-green-600" />
          </button>
        );
      case 'delete':
        return (
          <button key={action} onClick={() => onAction('delete')} className={common}>
            Delete <IconApprove className="size-5 text-red-600" />
          </button>
        );
    }
  };

  return <div className="absolute top-12 right-10 z-50 w-52 overflow-hidden rounded-l-md rounded-b-md bg-white shadow-lg">{actions.map(btn)}</div>;
}
