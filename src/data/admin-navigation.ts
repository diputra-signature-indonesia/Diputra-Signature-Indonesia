export type AdminNavChild = {
  label: string;
  href: string;
  slug: string;
};

export type AdminNavLink = {
  label: string;
  href: string;
  slug: string;
  children?: AdminNavChild[];
};

const ADMIN_ROUTE = '/admin';

export const ADMIN_NAV_ITEM: AdminNavLink[] = [
  { label: 'Blog Post', href: `${ADMIN_ROUTE}`, slug: 'blog' },
  // { label: 'Blog Post', href: '/blog', slug: 'blog', children: [{ label: 'Approval', href: '/approval', slug: 'approval' }] },
  { label: 'Reviews', href: `${ADMIN_ROUTE}/reviews`, slug: 'reviews' },
  { label: 'Test', href: `${ADMIN_ROUTE}/test`, slug: 'test' },
];
