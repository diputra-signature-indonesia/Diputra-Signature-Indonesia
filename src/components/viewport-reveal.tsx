'use client';

import { type CSSProperties, type ReactNode, useCallback, useEffect, useRef } from 'react';

import styles from './viewport-reveal.module.css';

type RevealTag = 'div' | 'article';

type ViewportRevealProps = {
  children: ReactNode;
  as?: RevealTag;
  className?: string;
  delay?: number;
  duration?: number;
  preserveScaleTransition?: boolean;
  preserveShadowTransition?: boolean;
  x?: number;
  y?: number;
};

type RevealStyle = CSSProperties & {
  '--reveal-delay': string;
  '--reveal-duration': string;
  '--reveal-x': string;
  '--reveal-y': string;
};

let revealObserver: IntersectionObserver | null = null;
const observedElements = new Set<Element>();

function stopObserving(element: Element) {
  revealObserver?.unobserve(element);
  observedElements.delete(element);

  if (observedElements.size === 0) {
    revealObserver?.disconnect();
    revealObserver = null;
  }
}

function getRevealObserver() {
  revealObserver ??= new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;

      entry.target.setAttribute('data-reveal-visible', 'true');
      stopObserving(entry.target);
    }
  });

  return revealObserver;
}

function observeReveal(element: Element) {
  if (!('IntersectionObserver' in window)) {
    element.setAttribute('data-reveal-visible', 'true');
    return () => undefined;
  }

  observedElements.add(element);
  getRevealObserver().observe(element);

  return () => stopObserving(element);
}

export function ViewportReveal({ children, as = 'div', className, delay = 0, duration = 0.4, preserveScaleTransition = false, preserveShadowTransition = false, x = 0, y = 12 }: ViewportRevealProps) {
  const elementRef = useRef<HTMLElement | null>(null);
  const setElementRef = useCallback((element: HTMLElement | null) => {
    elementRef.current = element;
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    return observeReveal(element);
  }, []);

  const revealStyle: RevealStyle = {
    '--reveal-delay': `${delay}s`,
    '--reveal-duration': `${duration}s`,
    '--reveal-x': `${x}px`,
    '--reveal-y': `${y}px`,
  };

  const revealClassName = [styles.reveal, preserveScaleTransition && styles.revealWithScale, preserveShadowTransition && styles.revealWithShadow, className].filter(Boolean).join(' ');

  if (as === 'article') {
    return (
      <article className={revealClassName} ref={setElementRef} style={revealStyle}>
        {children}
      </article>
    );
  }

  return (
    <div className={revealClassName} ref={setElementRef} style={revealStyle}>
      {children}
    </div>
  );
}
