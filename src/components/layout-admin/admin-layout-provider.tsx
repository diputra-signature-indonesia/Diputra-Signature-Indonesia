'use client';
import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { AdminNav } from './admin-navigation';
import { AdminHeader } from './admin-header';
import { ADMIN_NAV_ITEM } from '@/data/admin-navigation';

type AdminLayoutContextValue = {
  isNavOpen: boolean;
  setIsNavOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

export const AdminLayoutContext = createContext<AdminLayoutContextValue | null>(null);

export function useAdminLayout() {
  const ctx = useContext(AdminLayoutContext);
  if (!ctx) {
    throw new Error('useAdminLayout must be used within AdminLayoutProvider');
  }
  return ctx;
}

export function AdminLayoutProvider({ children }: { children: ReactNode }) {
  const [isNavOpen, setIsNavOpen] = useState(true);

  return (
    <AdminLayoutContext.Provider value={{ isNavOpen, setIsNavOpen }}>
      <AdminHeader />
      <div className="flex min-h-0 w-full flex-1">
        <AdminNav AdminNavItem={ADMIN_NAV_ITEM} />
        <div className="flex-1 overflow-y-scroll">{children}</div>
      </div>
    </AdminLayoutContext.Provider>
  );
}
