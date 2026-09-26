'use client';

import { getAdminBreadcrumbLabel } from '@/data/admin-navigation';
import { Avatar } from '@mui/material';
import { Bell, ChevronRight, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminLayout } from './admin-layout-provider';

interface AdminHeaderProps {
  username: string;
  avatarUrl: string | null;
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return 'A';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words.at(-1)?.[0] ?? ''}`.toUpperCase();
}

export function AdminHeader({ username, avatarUrl }: AdminHeaderProps) {
  const { isNavCollapsed, setIsNavCollapsed, setIsMobileNavOpen } = useAdminLayout();
  const pathname = usePathname();
  const breadcrumbLabel = getAdminBreadcrumbLabel(pathname);
  const isJobDetail = /^\/admin\/all-jobs\/[^/]+/.test(pathname);

  return (
    <header
      className="flex h-16 w-full shrink-0 items-center justify-between border-b border-[#8C1010]/10 bg-white px-4 sm:px-6 lg:px-8"
      style={{ fontFamily: 'var(--font-admin-sidebar), sans-serif' }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={() => setIsMobileNavOpen(true)}
          className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-[#FFDBCD] text-[#594040] transition-colors hover:bg-[#FFF7F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/35 lg:hidden"
        >
          <Menu aria-hidden="true" className="size-4" strokeWidth={1.8} />
        </button>
        <button
          type="button"
          aria-label={isNavCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
          title={isNavCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
          onClick={() => setIsNavCollapsed((collapsed) => !collapsed)}
          className="hidden size-8 shrink-0 items-center justify-center rounded-xl border border-[#FFDBCD] text-[#594040] transition-colors hover:bg-[#FFF7F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/35 lg:flex"
        >
          {isNavCollapsed ? <PanelLeftOpen aria-hidden="true" className="size-4" strokeWidth={1.8} /> : <PanelLeftClose aria-hidden="true" className="size-4" strokeWidth={1.8} />}
        </button>
        <div className="flex min-w-0 items-center gap-1.5 pl-0.5 text-xs font-semibold leading-[21px]">
          {isJobDetail ? (
            <>
              <Link href="/admin/all-jobs" className="shrink-0 text-[#5F5553] transition hover:text-[#8C1010]">All Jobs</Link>
              <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-[#9D9694]" />
              <span className="truncate text-[#8C1010]">Job Detail</span>
            </>
          ) : (
            <span className="truncate text-[#8C1010]">{breadcrumbLabel}</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <button
          type="button"
          aria-label="Notifications"
          title="Notifications"
          className="relative flex size-8 items-center justify-center rounded-xl text-black transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/35"
        >
          <Bell aria-hidden="true" className="h-5 w-4" strokeWidth={1.8} />
          <span aria-hidden="true" className="absolute top-0.5 right-1 size-2 rounded-full border-2 border-white bg-red-500" />
        </button>

        <div className="border-l border-[#E1BEBE] pl-4">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar
              src={avatarUrl ?? undefined}
              alt={username}
              variant="rounded"
              sx={{ width: 32, height: 32, borderRadius: '12px', bgcolor: '#A6192E', fontSize: '12px', fontWeight: 600 }}
            >
              {getInitials(username)}
            </Avatar>
            <span className="max-w-24 truncate text-xs font-medium leading-4 tracking-[0.05em] text-[#1A1C1E] sm:max-w-36" title={username}>
              {username}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
