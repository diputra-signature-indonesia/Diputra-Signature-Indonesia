'use client';
import { useState, type ButtonHTMLAttributes, type MouseEventHandler, type ReactNode } from 'react';
import Image from 'next/image';
import IconPlus from '@/icons/BrandIconPlus';

interface TeamButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  position: string;
  children: ReactNode;
  photoSrc?: string;
  photoAlt?: string;
  isOpen: boolean; // ⬅ NEW : dikontrol parent
  onToggle: () => void; // ⬅ NEW : event dari parent
}

export function TeamButton({ position, children, type = 'button', isOpen, onToggle, className, photoSrc, photoAlt = '', onClick, ...props }: TeamButtonProps) {
  return (
    <button type={type} onClick={onToggle} className={`flex w-full flex-col max-lg:border-b max-lg:border-neutral-300 lg:flex-row lg:items-center ${className ?? ''} `} {...props}>
      {photoSrc && (
        <div
          className={`ml-8 flex shrink-0 overflow-hidden transition-all duration-500 max-lg:order-2 sm:ml-13 lg:ml-0 ${isOpen ? 'mb-5 h-[180px] w-[150px] opacity-100 lg:mt-5 lg:mr-16 lg:h-[216px] lg:w-[180px] xl:mr-20 xl:h-[300px] xl:w-[250px]' : 'h-0 w-0 opacity-0'}`}
        >
          <Image src={photoSrc} alt={photoAlt} width={250} height={300} className="aspect-5/6 object-cover" />
        </div>
      )}

      <div className="flex w-full gap-2 py-4 text-left uppercase transition-colors hover:bg-neutral-100 sm:items-center sm:gap-4 sm:px-5 lg:border-b lg:border-neutral-300">
        <span className="flex h-6 w-6 shrink-0 justify-center sm:mb-auto lg:items-center">
          <IconPlus className="size-3 sm:size-5" />
        </span>
        <div className="flex w-full max-sm:flex-col">
          <h3 className="brand-p flex-1">{children}</h3>
          <span className="text-brand-maroon brand-p shrink-0">{position}</span>
        </div>
      </div>
    </button>
  );
}
