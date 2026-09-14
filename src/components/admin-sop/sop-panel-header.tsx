import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type SopPanelHeaderProps = {
  icon: LucideIcon;
  title: string;
  badge?: ReactNode;
  action?: ReactNode;
  divider?: boolean;
};

export function SopPanelHeader({ icon: Icon, title, badge, action, divider = false }: SopPanelHeaderProps) {
  return (
    <header className={`flex items-center justify-between gap-4 ${divider ? 'border-b border-[#C8CDD5] pb-4' : ''}`}>
      <div className="flex min-w-0 items-center gap-2">
        <Icon aria-hidden="true" className="size-5 shrink-0 text-[#8C1010]" strokeWidth={1.9} />
        <h2 className="truncate text-lg font-semibold text-[#292323]">{title}</h2>
        {badge}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
