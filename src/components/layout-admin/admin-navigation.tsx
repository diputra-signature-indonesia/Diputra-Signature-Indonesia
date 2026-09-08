'use client';

import type { AdminNavLink } from '@/data/admin-navigation';
import { cn } from '@/lib/cn';
import { CircleHelp, LogOut } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAdminLayout } from './admin-layout-provider';

function isItemActive(item: AdminNavLink, pathname: string) {
  return item.activePaths?.some((path) => (path === '/admin' ? pathname === path : pathname === path || pathname.startsWith(`${path}/`))) ?? false;
}

export function AdminNav({ AdminNavItem }: { AdminNavItem: AdminNavLink[] }) {
  const { isNavOpen, setIsNavOpen } = useAdminLayout();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await fetch('/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const closeMobileNav = () => setIsNavOpen(false);

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex h-dvh w-64 shrink-0 flex-col border-r border-gray-200/70 bg-white px-4 pb-4 shadow-[1px_0_8px_rgba(15,23,42,0.03)] transition-transform duration-200 ease-out lg:static lg:z-auto lg:translate-x-0',
        isNavOpen ? 'translate-x-0' : '-translate-x-full'
      )}
      style={{ fontFamily: 'var(--font-admin-sidebar), sans-serif' }}
    >
      <div className="w-full pt-2 pb-8">
        <Link href="/admin" onClick={closeMobileNav} aria-label="Diputra Signature Indonesia admin">
          <Image
            alt="Diputra Signature Indonesia"
            src="/icon/dsi-logo.png"
            width={206}
            height={69}
            sizes="206px"
            priority
            className="h-[69px] w-full object-contain px-2"
          />
        </Link>
      </div>

      <nav aria-label="Admin navigation" className="flex min-h-0 w-full flex-1 flex-col items-center gap-1 overflow-y-auto">
        {AdminNavItem.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item, pathname);
          const itemClasses = cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium leading-4 tracking-[0.05em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/35',
            active ? 'bg-[#8C1010] text-white' : 'text-[#121212] hover:bg-neutral-100',
            item.disabled && 'cursor-default hover:bg-transparent'
          );

          if (!item.href || item.disabled) {
            return (
              <div key={item.slug} className={itemClasses} aria-disabled="true" title="Fitur akan tersedia pada pengembangan V2 berikutnya">
                <Icon aria-hidden="true" className="size-[18px] shrink-0" strokeWidth={1.7} />
                <span>{item.label}</span>
              </div>
            );
          }

          return (
            <Link key={item.slug} href={item.href} onClick={closeMobileNav} aria-current={active ? 'page' : undefined} className={itemClasses}>
              <Icon aria-hidden="true" className="size-[18px] shrink-0" strokeWidth={1.7} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="w-full pt-4">
        <div className="flex flex-col gap-1 border-t border-[#2D2B70]/40 pt-4">
          <Link
            href="/contact"
            onClick={closeMobileNav}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium leading-4 tracking-[0.05em] text-[#121212] transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/35"
          >
            <CircleHelp aria-hidden="true" className="size-[18px] shrink-0" strokeWidth={1.7} />
            <span>Support</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium leading-4 tracking-[0.05em] text-[#121212] transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/35 disabled:cursor-wait disabled:opacity-60"
          >
            <LogOut aria-hidden="true" className="size-[18px] shrink-0" strokeWidth={1.7} />
            <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
