'use client';
import type { AdminNavLink } from '@/data/admin-navigation';
import IconLogout from '@/icons/BrandIconLogout';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminLayout } from './admin-layout-provider';

export function AdminNav({ AdminNavItem }: { AdminNavItem: AdminNavLink[] }) {
  const { isNavOpen } = useAdminLayout();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/logout', { method: 'POST' });
    router.push('/login');
    router.refresh(); // optional tapi bagus untuk reset state
  };
  return (
    <nav className={`font-raleway bg-brand-white flex ${isNavOpen ? 'w-64' : 'w-0'} flex-col overflow-hidden border-r border-gray-200 bg-white shadow-sm transition-[width]`}>
      <Image alt="diputra-signature-indonesia" src="/icon/dsi-logo.png" width={100} height={50} sizes="(max-width: 768px) 200px" className="mt-7 mb-4 h-auto w-full object-contain px-4" />
      {AdminNavItem.map((item) => {
        const Icon = item.icon ?? null;
        return (
          <div key={item.slug} className="flex w-64 flex-col">
            <Link href={item.href} className={`brand-p hover:bg-brand-burgundy flex w-full border-gray-200 px-7 py-4 font-medium hover:text-white ${item.children ? 'border-b-0' : 'border-b'}`}>
              {item.label} <span className="ml-auto">{Icon && <Icon className="inline-block size-5" />}</span>
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
        );
      })}
      <button onClick={handleLogout} className={`brand-p hover:bg-brand-burgundy mt-auto flex w-full px-7 py-4 text-left transition-colors hover:text-white`}>
        Logout{' '}
        <span className="ml-auto">
          <IconLogout className="inline-block size-5" />
        </span>
      </button>
    </nav>
  );
}
