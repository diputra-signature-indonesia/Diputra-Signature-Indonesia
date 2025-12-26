'use client';
import type { AdminNavLink } from '@/data/admin-navigation';
import { useAdminLayout } from './admin-layout-provider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function AdminNav({ AdminNavItem }: { AdminNavItem: AdminNavLink[] }) {
  const { isNavOpen } = useAdminLayout();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/logout', { method: 'POST' });
    router.push('/login');
    router.refresh(); // optional tapi bagus untuk reset state
  };
  return (
    <nav className={`font-raleway bg-brand-white flex ${isNavOpen ? 'w-64' : 'w-0'} flex-col overflow-hidden border-r-2 border-gray-200 pt-5 transition-[width]`}>
      {AdminNavItem.map((item) => (
        <div key={item.slug} className="flex w-64 flex-col">
          <Link href={item.href} className={`brand-p hover:bg-brand-burgundy w-full border-gray-200 px-7 py-4 hover:text-white ${item.children ? 'border-b-0' : 'border-b-2'}`}>
            {item.label}
          </Link>
          {item.children?.map((child, idx, arr) => (
            <Link
              key={child.slug}
              href={child.href}
              className={`brand-p hover:bg-brand-burgundy border-gray-200 py-4 pr-7 pl-10 text-sm transition-colors hover:text-white ${arr.length - 1 === idx ? 'border-b-2' : 'border-b-0'}`}
            >
              {child.label}
            </Link>
          ))}
        </div>
      ))}
      <button onClick={handleLogout} className={`brand-p hover:bg-brand-burgundy mt-auto w-full px-7 py-4 transition-colors hover:text-white`}>
        Logout
      </button>
    </nav>
  );
}
