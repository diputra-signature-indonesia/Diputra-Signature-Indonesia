import Image from '@tiptap/extension-image';
import { mergeAttributes } from '@tiptap/core';

function nestedImage(element: HTMLElement) {
  return element.tagName === 'IMG' ? element : element.querySelector('img');
}

export const ImageWithSize = Image.extend({
  addAttributes() {
    return {
      src: { default: null, parseHTML: (element) => nestedImage(element)?.getAttribute('src') },
      alt: { default: null, parseHTML: (element) => nestedImage(element)?.getAttribute('alt') },
      title: { default: null, parseHTML: (element) => nestedImage(element)?.getAttribute('title') },
      width: { default: null, parseHTML: (element) => nestedImage(element)?.getAttribute('width') },
      height: { default: null, parseHTML: (element) => nestedImage(element)?.getAttribute('height') },
      caption: {
        default: null,
        parseHTML: (element) => element.tagName === 'FIGURE' ? element.querySelector('[data-image-caption]')?.textContent : null,
      },
      credit: {
        default: null,
        parseHTML: (element) => element.tagName === 'FIGURE' ? element.querySelector('[data-image-credit]')?.textContent : null,
      },
    };
  },
  parseHTML() {
    return [{ tag: 'figure[data-article-image]' }, { tag: 'img[src]' }];
  },
  renderHTML({ HTMLAttributes }) {
    const { caption, credit, ...imageAttributes } = HTMLAttributes;
    const children: unknown[] = [
      ['img', mergeAttributes(this.options.HTMLAttributes, imageAttributes, { loading: 'lazy' })],
    ];
    if (caption || credit) {
      children.push([
        'figcaption',
        {},
        ...(caption ? [['span', { 'data-image-caption': 'true' }, String(caption)]] : []),
        ...(credit ? [['span', { 'data-image-credit': 'true' }, `Photo: ${String(credit)}`]] : []),
      ]);
    }
    return ['figure', { 'data-article-image': 'true' }, ...children] as never;
  },
});
