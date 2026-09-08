'use client';

import { isAdminNavItemActive, type AdminNavLink } from '@/data/admin-navigation';
import { cn } from '@/lib/cn';
import { CircleHelp, LogOut } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAdminLayout } from './admin-layout-provider';

export function AdminNav({ AdminNavItem }: { AdminNavItem: AdminNavLink[] }) {
  const { isNavCollapsed, isMobileNavOpen, setIsMobileNavOpen } = useAdminLayout();
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

  const closeMobileNav = () => setIsMobileNavOpen(false);

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex h-dvh w-64 shrink-0 flex-col border-r border-gray-200/70 bg-white px-4 pb-4 shadow-[1px_0_8px_rgba(15,23,42,0.03)] transition-[width,padding,transform] duration-200 ease-out lg:static lg:z-auto lg:translate-x-0',
        isMobileNavOpen ? 'translate-x-0' : '-translate-x-full',
        isNavCollapsed ? 'lg:w-[72px] lg:px-3' : 'lg:w-64 lg:px-4'
      )}
      style={{ fontFamily: 'var(--font-admin-sidebar), sans-serif' }}
    >
      <div className="flex h-[109px] w-full shrink-0 items-start justify-center pt-2 pb-8">
        <Link href="/admin" onClick={closeMobileNav} aria-label="Diputra Signature Indonesia admin" className="flex h-[69px] w-full items-center justify-center">
          <Image
            alt="Diputra Signature Indonesia"
            src="/icon/dsi-logo.png"
            width={206}
            height={69}
            sizes="206px"
            priority
            className={isNavCollapsed ? 'h-[69px] w-full object-contain px-2 lg:hidden' : 'h-[69px] w-full object-contain px-2'}
          />
          {isNavCollapsed ? (
            <span className="hidden size-9 items-center justify-center rounded-xl bg-[#8C1010] shadow-sm lg:flex">
              <Image alt="" src="/icon/icon-32.png" width={24} height={24} aria-hidden="true" className="size-6 rounded-full object-contain" />
            </span>
          ) : null}
        </Link>
      </div>

      <nav aria-label="Admin navigation" className="flex min-h-0 w-full flex-1 flex-col items-center gap-1 overflow-y-auto">
        {AdminNavItem.map((item) => {
          const Icon = item.icon;
          const active = isAdminNavItemActive(item, pathname);
          const itemClasses = cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium leading-4 tracking-[0.05em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/35',
            active ? 'bg-[#8C1010] text-white' : 'text-[#121212] hover:bg-neutral-100',
            item.disabled && 'cursor-default hover:bg-transparent',
            isNavCollapsed && 'lg:justify-center lg:gap-0 lg:px-0'
          );

          if (!item.href || item.disabled) {
            return (
              <div key={item.slug} className={itemClasses} aria-disabled="true" title={isNavCollapsed ? item.label : 'Fitur akan tersedia pada pengembangan V2 berikutnya'}>
                <Icon aria-hidden="true" className="size-[18px] shrink-0" strokeWidth={1.7} />
                <span className={isNavCollapsed ? 'lg:hidden' : undefined}>{item.label}</span>
              </div>
            );
          }

          return (
            <Link key={item.slug} href={item.href} onClick={closeMobileNav} aria-current={active ? 'page' : undefined} title={isNavCollapsed ? item.label : undefined} className={itemClasses}>
              <Icon aria-hidden="true" className="size-[18px] shrink-0" strokeWidth={1.7} />
              <span className={isNavCollapsed ? 'lg:hidden' : undefined}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="w-full pt-4">
        <div className="flex flex-col gap-1 border-t border-[#2D2B70]/40 pt-4">
          <Link
            href="/contact"
            onClick={closeMobileNav}
            title={isNavCollapsed ? 'Support' : undefined}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium leading-4 tracking-[0.05em] text-[#121212] transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/35',
              isNavCollapsed && 'lg:justify-center lg:gap-0 lg:px-0'
            )}
          >
            <CircleHelp aria-hidden="true" className="size-[18px] shrink-0" strokeWidth={1.7} />
            <span className={isNavCollapsed ? 'lg:hidden' : undefined}>Support</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            title={isNavCollapsed ? 'Logout' : undefined}
            className={cn(
              'flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium leading-4 tracking-[0.05em] text-[#121212] transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/35 disabled:cursor-wait disabled:opacity-60',
              isNavCollapsed && 'lg:justify-center lg:gap-0 lg:px-0'
            )}
          >
            <LogOut aria-hidden="true" className="size-[18px] shrink-0" strokeWidth={1.7} />
            <span className={isNavCollapsed ? 'lg:hidden' : undefined}>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
