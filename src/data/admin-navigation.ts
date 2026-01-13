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

export const ADMIN_NAV_ITEM: AdminNavLink[] = [
  { label: 'Blog Post', href: '/blog', slug: 'blog' },
  // { label: 'Blog Post', href: '/blog', slug: 'blog', children: [{ label: 'Approval', href: '/approval', slug: 'approval' }] },
  { label: 'Reviews', href: '/reviews', slug: 'reviews' },
];
