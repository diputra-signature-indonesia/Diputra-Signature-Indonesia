'use client';
import IconBurger from '@/icons/BrandIconBurger';
import { useAdminLayout } from './admin-layout-provider';

interface AdminHeaderProps {
  username: string;
}

export function AdminHeader({ username }: AdminHeaderProps) {
  const { setIsNavOpen } = useAdminLayout();
  return (
    <header className="font-raleway bg-brand-burgundy flex w-full border-b-2 border-gray-200 px-7 py-5">
      <div className="flex gap-4">
        <button type="button" onClick={() => setIsNavOpen((p) => !p)} className="cursor-pointer">
          <IconBurger className="text-white" />
        </button>
        <p className="text-white">{username}</p>
      </div>
    </header>
  );
}
