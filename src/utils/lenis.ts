// src/utils/lenis.ts
import Lenis from 'lenis';

export function initLenis() {
  const lenis = new Lenis();

  function raf(time: number) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }

  requestAnimationFrame(raf);

  return lenis; // optional: supaya bisa stop, destroy, dll
}
