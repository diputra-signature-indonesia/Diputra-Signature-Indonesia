'use client';
import { ADMIN_NAV_ITEM } from '@/data/admin-navigation';
import type { UserRole } from '@/types/auth-role';
import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';
import { AdminHeader } from './admin-header';
import { AdminNav } from './admin-navigation';

type AdminLayoutContextValue = {
  isNavCollapsed: boolean;
  setIsNavCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  isMobileNavOpen: boolean;
  setIsMobileNavOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

export const AdminLayoutContext = createContext<AdminLayoutContextValue | null>(null);

export function useAdminLayout() {
  const ctx = useContext(AdminLayoutContext);
  if (!ctx) {
    throw new Error('useAdminLayout must be used within AdminLayoutProvider');
  }
  return ctx;
}

interface AdminLayoutProviderProps {
  username: string;
  avatarUrl: string | null;
  role: UserRole;
  children: ReactNode;
}

export function AdminLayoutProvider({ username, avatarUrl, role, children }: AdminLayoutProviderProps) {
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <AdminLayoutContext.Provider value={{ isNavCollapsed, setIsNavCollapsed, isMobileNavOpen, setIsMobileNavOpen }}>
      <div className="flex min-h-0 w-full flex-1 overflow-hidden">
        <AdminNav AdminNavItem={ADMIN_NAV_ITEM.filter((item) => !item.roles || item.roles.includes(role))} />
        {isMobileNavOpen ? (
          <button type="button" aria-label="Close navigation" className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setIsMobileNavOpen(false)} />
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminHeader username={username} avatarUrl={avatarUrl} />
          <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </AdminLayoutContext.Provider>
  );
}
