import { cn } from '@/lib/cn';
import { Slot } from '@radix-ui/react-slot';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type BrandButtonVariants = 'yellow' | 'white' | 'black' | 'red' | 'ghost';

type BrandButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BrandButtonVariants;
  loading?: boolean;
  asChild?: boolean;
  children?: ReactNode;
};

export function BrandButton({ asChild = false, children, className, variant = 'yellow', loading = false, type = 'button', ...props }: BrandButtonProps) {
  const baseClasses = cn(
    'font-raleway focus-visible:ring-brand-maroon inline-flex h-fit cursor-pointer items-center gap-2.5 rounded-md border px-7 py-2 text-xs leading-[125%] tracking-wider text-black transition-colors  focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none  sm:py-2.5 sm:text-sm lg:text-base',
    variant === 'yellow' && 'border-brand-yellow bg-brand-white hover:bg-brand-yellow-semi font-semibold text-black',
    variant === 'white' && 'border-brand-black bg-brand-white hover:bg-brand-white-semi text-brand-black font-semibold',
    variant === 'black' && 'border-brand-white bg-brand-black hover:bg-brand-black-semi text-brand-white font-semibold',
    variant === 'red' && 'border-brand-maroon bg-brand-maroon hover:bg-brand-burgundy text-brand-white font-semibold',
    variant === 'ghost' && 'hover:bg-brand-black/5 rounded-none border-none bg-transparent font-semibold',
    className
  );

  if (asChild) {
    // ⬇ asChild → jangan kirim prop "type", biarkan elemen anak yang atur (misal <a>, <Link>)
    return (
      <Slot className={baseClasses} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button type={type} className={baseClasses} disabled={loading || props.disabled} {...props}>
      {loading && <span className="aspect-square size-[1em] animate-spin rounded-full border-3 border-white border-b-transparent" />}
      {children}
    </button>
  );
}
