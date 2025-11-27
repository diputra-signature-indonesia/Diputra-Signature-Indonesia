import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '@/app/lib/cn';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function Button({ children, className, variant = 'primary', ...props }: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition',
        variant === 'primary' && 'bg-brand-700 text-white hover:bg-brand-500',
        variant === 'secondary' && 'border border-brand-700 text-brand-700 hover:bg-brand-50',
        variant === 'ghost' && 'text-brand-700 hover:bg-brand-50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
