import sanitizeHtml from 'sanitize-html';

const ARTICLE_TAGS = [
  'p', 'br', 'span', 'h1', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'u', 's', 'mark',
  'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'hr', 'a', 'figure', 'figcaption',
  'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'iframe',
];

export function sanitizeArticleHtml(value: string) {
  return sanitizeHtml(value, {
    allowedTags: ARTICLE_TAGS,
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      figure: ['data-article-image'],
      iframe: ['src', 'width', 'height', 'title', 'allow', 'allowfullscreen', 'frameborder'],
      p: ['style'],
      h1: ['style'],
      h2: ['style'],
      h3: ['style'],
      span: ['style', 'data-image-caption', 'data-image-credit'],
      mark: ['style', 'data-color'],
      th: ['colspan', 'rowspan'],
      td: ['colspan', 'rowspan'],
    },
    allowedStyles: {
      '*': {
        color: [/^#[0-9a-f]{6}$/i, /^rgba?\([\d\s,.%]+\)$/i],
        'background-color': [/^#[0-9a-f]{6}$/i, /^rgba?\([\d\s,.%]+\)$/i],
        'text-align': [/^(left|center|right|justify)$/],
      },
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['http', 'https'], iframe: ['https'] },
    allowedIframeHostnames: ['www.youtube.com', 'www.youtube-nocookie.com'],
    transformTags: {
      h1: 'h2',
      a: (_tagName, attribs) => {
        const external = /^https?:\/\//i.test(attribs.href ?? '');
        const nextAttributes = { ...attribs };
        if (external) {
          nextAttributes.target = '_blank';
          nextAttributes.rel = 'noopener noreferrer';
        } else {
          delete nextAttributes.target;
          delete nextAttributes.rel;
        }
        return { tagName: 'a', attribs: nextAttributes };
      },
      img: (_tagName, attribs) => ({
        tagName: 'img',
        attribs: { ...attribs, alt: attribs.alt ?? '', loading: 'lazy' },
      }),
      iframe: (_tagName, attribs) => ({
        tagName: 'iframe',
        attribs: { ...attribs, title: attribs.title || 'Embedded YouTube video' },
      }),
    },
    exclusiveFilter(frame) {
      if (frame.tag === 'iframe') {
        try {
          const url = new URL(frame.attribs.src ?? '');
          return !['www.youtube.com', 'www.youtube-nocookie.com'].includes(url.hostname);
        } catch {
          return true;
        }
      }
      return false;
    },
  }).trim();
}

export function articlePlainText(value: string) {
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function articleWordCount(value: string) {
  const text = articlePlainText(value);
  return text ? text.split(/\s+/).length : 0;
}
