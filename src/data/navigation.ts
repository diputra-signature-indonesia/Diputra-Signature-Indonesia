export type NavLinkItem = {
  href: string;
  label: string;
  slug: string;
};

export type NavDropdownItem = {
  label: string;
  slug: string;
  children: NavLinkItem[];
};

export type NavItem = NavLinkItem | NavDropdownItem;

export function isDropdown(item: NavItem): item is NavDropdownItem {
  return 'children' in item;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Home', slug: 'home' },
  { href: '/about', label: 'About', slug: 'about' },
  {
    label: 'Services',
    slug: 'services',
    children: [
      { href: '/services/legal-and-corporate', label: 'Legal', slug: 'legal-and-corporate' },
      { href: '/services/visa', label: 'Visa', slug: 'visa' },
      { href: '/services/real-estate', label: 'Real Estate', slug: 'real-estate' },
      { href: '/services/insurance', label: 'Insurance', slug: 'insurance' },
      {
        href: '/services/intellectual-property-and-trademark-registration-services',
        label: 'Intellectual Property & Trademark Registration',
        slug: 'intellectual-property-and-trademark-registration-services',
      },
    ],
  },
  { href: '/blog', label: 'Blog', slug: 'blog' },
];

export const CONTACT_LINK: NavLinkItem = { href: '/contact', label: 'Contact Us', slug: 'contact' };
