import type { ReactNode } from 'react';

type AdminPageHeaderProps = {
  title: string;
  description: ReactNode;
  action?: ReactNode;
};

export function AdminPageHeader({ title, description, action }: AdminPageHeaderProps) {
  return (
    <section className="flex items-end justify-between gap-4 border-b border-gray-200 bg-white px-4 py-3.5 sm:px-5 lg:px-8">
      <div className="min-w-0">
        <h1 className="text-[28px] font-semibold leading-9 tracking-tight text-[#1A1C1E]">{title}</h1>
        <p className="mt-0.5 text-xs leading-5 text-[#A61919] sm:text-sm">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </section>
  );
}
