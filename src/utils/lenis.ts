import Lenis from 'lenis';

export function initLenis() {
  return new Lenis({
    anchors: true,
    autoRaf: true,
  });
}
