import Image from '@tiptap/extension-image';

export const ImageWithSize = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null },
      height: { default: null },
    };
  },
  renderHTML({ HTMLAttributes }) {
    return ['img', HTMLAttributes];
  },
});
