'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

type MotionTag = 'div' | 'section' | 'article' | 'main' | 'header' | 'footer' | 'nav' | 'aside' | 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'ul' | 'li' | 'button' | 'a';

type Base = {
  children: ReactNode;
  as?: MotionTag;
  delay?: number;
  duration?: number;
  y?: number;
  x?: number;
  once?: boolean;
  className?: string;
};

export type MotionProps<T extends MotionTag = 'div'> = Base & Omit<HTMLMotionProps<T>, 'children' | 'transition' | 'initial' | 'whileInView' | 'viewport'>;

export function Motion<T extends MotionTag = 'div'>({ children, as, delay = 0, duration = 0.4, y = 12, x = 0, once = true, className, ...props }: MotionProps<T>) {
  const Tag = (as ?? 'div') as T;
  const Component = motion[Tag] as unknown as React.ComponentType<HTMLMotionProps<T>>;

  return (
    <Component
      initial={{ opacity: 0, y, x }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once }}
      transition={{ duration, delay, ease: 'easeOut' }}
      className={className}
      {...(props as HTMLMotionProps<T>)}
    >
      {children}
    </Component>
  );
}
