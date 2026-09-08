import IconArticle from '@/icons/BrandIconArticle';
import IconReview from '@/icons/BrandIconReview';
import type { UserRole } from '@/types/auth-role';
import { UserRoundCheck } from 'lucide-react';

export type AdminNavChild = {
  label: string;
  href: string;
  slug: string;
};

export type AdminNavLink = {
  label: string;
  href: string;
  slug: string;
  icon?: React.ElementType;
  roles?: UserRole[];
  children?: AdminNavChild[];
};

const ADMIN_ROUTE = '/admin';

export const ADMIN_NAV_ITEM: AdminNavLink[] = [
  { label: 'Blog Post', href: `${ADMIN_ROUTE}`, slug: 'blog', icon: IconArticle },
  // { label: 'Blog Post', href: '/blog', slug: 'blog', children: [{ label: 'Approval', href: '/approval', slug: 'approval' }] },
  { label: 'Reviews', href: `${ADMIN_ROUTE}/reviews`, slug: 'reviews', icon: IconReview },
  {
    label: 'Access Requests',
    href: `${ADMIN_ROUTE}/access-requests`,
    slug: 'access-requests',
    icon: UserRoundCheck,
    roles: ['super_admin'],
  },
];
