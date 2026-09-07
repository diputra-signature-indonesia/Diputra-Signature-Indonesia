export const BLOG_IMAGE_BUCKET = 'images';
export const BLOG_IMAGE_EDITOR_FOLDER = 'blog';
export const BLOG_IMAGE_COVER_FOLDER = 'blog_cover';

export const BLOG_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const BLOG_IMAGE_MAX_LABEL = '5 MiB';
export const BLOG_IMAGE_CACHE_CONTROL = '31536000';

export const BLOG_IMAGE_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const BLOG_IMAGE_ACCEPT = BLOG_IMAGE_ALLOWED_MIME_TYPES.join(',');

type BlogImageMimeType = (typeof BLOG_IMAGE_ALLOWED_MIME_TYPES)[number];
type BlogImageFolder = typeof BLOG_IMAGE_EDITOR_FOLDER | typeof BLOG_IMAGE_COVER_FOLDER;

const EXTENSION_BY_MIME: Record<BlogImageMimeType, 'jpg' | 'png' | 'webp'> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function validateBlogImageFile(file: Pick<File, 'size' | 'type'>): BlogImageMimeType {
  if (!BLOG_IMAGE_ALLOWED_MIME_TYPES.includes(file.type as BlogImageMimeType)) {
    throw new Error('Only JPEG, PNG, or WebP images are allowed.');
  }

  if (file.size > BLOG_IMAGE_MAX_BYTES) {
    throw new Error(`Image size must not exceed ${BLOG_IMAGE_MAX_LABEL}.`);
  }

  return file.type as BlogImageMimeType;
}

export function createBlogImagePath(folder: BlogImageFolder, file: Pick<File, 'size' | 'type'>) {
  const mimeType = validateBlogImageFile(file);
  const extension = EXTENSION_BY_MIME[mimeType];

  return `${folder}/${crypto.randomUUID()}.${extension}`;
}
