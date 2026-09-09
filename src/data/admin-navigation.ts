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
    href: `${ADMIN_ROUTE}/dashboard`,
    slug: 'dashboard',
    icon: LayoutDashboard,
    activePaths: [`${ADMIN_ROUTE}/dashboard`],
  },
  {
    label: 'My Tasks',
    href: `${ADMIN_ROUTE}/my-tasks`,
    slug: 'my-tasks',
    icon: ListTodo,
    activePaths: [`${ADMIN_ROUTE}/my-tasks`],
  },
  {
    label: 'All Jobs',
    href: `${ADMIN_ROUTE}/all-jobs`,
    slug: 'all-jobs',
    icon: BriefcaseBusiness,
    activePaths: [`${ADMIN_ROUTE}/all-jobs`],
  },
  {
    label: 'SOP',
    href: `${ADMIN_ROUTE}/sop`,
    slug: 'sop',
    icon: ArrowLeftRight,
    activePaths: [`${ADMIN_ROUTE}/sop`],
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
    href: `${ADMIN_ROUTE}/master-data`,
    slug: 'master-data',
    icon: Database,
    activePaths: [`${ADMIN_ROUTE}/master-data`],
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

export function isAdminNavItemActive(item: AdminNavLink, pathname: string) {
  return item.activePaths?.some((path) => (path === ADMIN_ROUTE ? pathname === path : pathname === path || pathname.startsWith(`${path}/`))) ?? false;
}

export function getAdminBreadcrumbLabel(pathname: string) {
  return ADMIN_NAV_ITEM.find((item) => isAdminNavItemActive(item, pathname))?.label ?? 'Admin';
}
