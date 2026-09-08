import type { UserRole } from '@/types/auth-role';
import { ArrowLeftRight, BriefcaseBusiness, Database, FileCheck2, LayoutDashboard, ListTodo, SquarePen, UserRoundCog } from 'lucide-react';

export type AdminNavLink = {
  label: string;
  href?: string;
  slug: string;
  icon: React.ElementType;
  roles?: UserRole[];
  disabled?: boolean;
  activePaths?: string[];
};

const ADMIN_ROUTE = '/admin';

export const ADMIN_NAV_ITEM: AdminNavLink[] = [
  {
    label: 'Dashboard',
    slug: 'dashboard',
    icon: LayoutDashboard,
    disabled: true,
  },
  {
    label: 'My Tasks',
    slug: 'my-tasks',
    icon: ListTodo,
    disabled: true,
  },
  {
    label: 'All Jobs',
    slug: 'all-jobs',
    icon: BriefcaseBusiness,
    disabled: true,
  },
  {
    label: 'SOP',
    slug: 'sop',
    icon: ArrowLeftRight,
    disabled: true,
  },
  {
    label: 'Blogpost',
    href: ADMIN_ROUTE,
    slug: 'blog',
    icon: SquarePen,
    activePaths: [ADMIN_ROUTE, `${ADMIN_ROUTE}/blog`],
  },
  {
    label: 'Review',
    href: `${ADMIN_ROUTE}/reviews`,
    slug: 'reviews',
    icon: FileCheck2,
    activePaths: [`${ADMIN_ROUTE}/reviews`],
  },
  {
    label: 'Master Data',
    slug: 'master-data',
    icon: Database,
    disabled: true,
  },
  {
    label: 'User Management',
    href: `${ADMIN_ROUTE}/access-requests`,
    slug: 'user-management',
    icon: UserRoundCog,
    roles: ['super_admin'],
    activePaths: [`${ADMIN_ROUTE}/access-requests`],
  },
];
