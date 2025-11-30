import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '@/lib/cn';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'yellow' | 'white' | 'black' | 'red' | 'ghost';
  loading?: boolean;
};

export function BrandButton({ 
  children, 
  className, 
  variant = 'yellow', 
  loading = false,
  type = 'button',
  ...props }: PropsWithChildren<ButtonProps>) {
    
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center h-fit px-7 py-2 sm:py-2.5 border rounded-lg sm:rounded-xl text-black font-raleway font-light text-xs sm:text-sm lg:text-base tracking-wider leading-[125%] cursor-pointer transition-colors gap-2.5 focus-visible:outline-none focus-visible:rounded-xl focus-visible:ring-2 focus-visible:ring-brand-maroon focus-visible:ring-offset-2',
        variant === 'yellow' && 'border-brand-yellow bg-brand-yellow hover:bg-brand-yellow-semi font-semibold text-white',
        variant === 'white' && 'border-brand-black bg-brand-white hover:bg-brand-white-semi text-brand-black',
        variant === 'black' && 'border-brand-white bg-brand-black hover:bg-brand-black-semi text-brand-white',
        variant === 'red' && 'border-brand-maroon bg-brand-maroon hover:bg-brand-burgundy text-brand-white ',
        variant === 'ghost' && 'border-none bg-transparent rounded-none hover:bg-brand-black/5',
        className,
      )}
      {...props}
    >
      {loading && (
        <span className="size-[1em] aspect-square animate-spin rounded-full border-3 border-white border-b-transparent" />
      )}
      {children}
    </button>
  );
}
