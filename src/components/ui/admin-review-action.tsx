'use client';
import IconApprove from '@/icons/BrandIconApprove';
import IconDelete from '@/icons/BrandIconDelete';
import { UserRole } from '@/types/auth-role';
import type { ReviewActionTable } from '@/types/review-action';
import { ReviewFeature, ReviewStatus } from '@/types/review-status';

type ReviewActionProps = {
  role: UserRole | null;
  status: ReviewStatus;
  featured: ReviewFeature;
  onAction: (action: ReviewActionTable) => void;
  loadingAction?: ReviewActionTable | null; // optional buat loading UI
};

const can = (role: UserRole | null) => ({
  publish: role === 'super_admin' || role === 'admin' || role === 'editor',
  delete: role === 'super_admin' || role === 'admin',
});

function getAllowedActions(role: UserRole | null, status: ReviewStatus, featured: ReviewFeature): ReviewActionTable[] {
  const p = can(role);
  const actions: ReviewActionTable[] = []; // always

  // editor/admin can move draft<->pending
  if (p.publish && status === 'unpublished') actions.push('publish');
  if (p.publish && status === 'published') actions.push('unpublish');

  if (p.publish && featured === 'unfeatured') actions.push('feature');
  if (p.publish && featured === 'featured') actions.push('unfeature');

  // delete only admin/super (optional: hide when published)
  if (p.delete && status !== 'published') actions.push('delete');

  return actions;
}

export function ReviewAction({ role, status, featured, onAction, loadingAction }: ReviewActionProps) {
  const actions = getAllowedActions(role, status, featured);

  const btn = (action: ReviewActionTable) => {
    const isLoading = loadingAction === action;

    const common = `flex w-full items-center justify-between gap-2 px-5 py-4 text-sm hover:bg-gray-100 ${isLoading ? 'opacity-60 pointer-events-none' : ''}`;

    switch (action) {
      case 'publish':
        return (
          <button key={action} onClick={() => onAction('publish')} className={common}>
            Publish <IconApprove className="size-5 text-green-600" />
          </button>
        );
      case 'unpublish':
        return (
          <button key={action} onClick={() => onAction('unpublish')} className={common}>
            Unpublish <IconApprove className="size-5 text-red-600" />
          </button>
        );
      case 'feature':
        return (
          <button key={action} onClick={() => onAction('feature')} className={common}>
            Feature <IconApprove className="size-5 text-green-600" />
          </button>
        );
      case 'unfeature':
        return (
          <button key={action} onClick={() => onAction('unfeature')} className={common}>
            Unfeature <IconApprove className="size-5 text-yellow-600" />
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
