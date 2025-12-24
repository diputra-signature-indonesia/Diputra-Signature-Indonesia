'use client';
import IconBurger from '@/icons/BrandIconBurger';
import { useAdminLayout } from './admin-layout-provider';

export function AdminHeader() {
  const { setIsNavOpen } = useAdminLayout();
  return (
    <header className="font-raleway flex w-full border-b-2 border-gray-200 px-7 py-5">
      <div className="flex gap-4">
        <button type="button" onClick={() => setIsNavOpen((p) => !p)} className="cursor-pointer">
          <IconBurger className="text-black" />
        </button>
        <p>Username</p>
      </div>
    </header>
  );
}
