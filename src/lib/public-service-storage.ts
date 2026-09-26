export const PUBLIC_SERVICE_ASSET_BUCKET = 'images';
export const PUBLIC_SERVICE_CATEGORY_FOLDER = 'services/categories';
export const PUBLIC_SERVICE_ITEM_FOLDER = 'services/items';
export const PUBLIC_SERVICE_ASSET_CACHE_CONTROL = '31536000';

export const PUBLIC_SERVICE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PUBLIC_SERVICE_SVG_MAX_BYTES = 512 * 1024;
export const PUBLIC_SERVICE_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
export const PUBLIC_SERVICE_SVG_ACCEPT = 'image/svg+xml,.svg';

const IMAGE_EXTENSION_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

export function createPublicServiceImagePath(file: Pick<File, 'size' | 'type'>) {
  const extension = IMAGE_EXTENSION_BY_MIME[file.type as keyof typeof IMAGE_EXTENSION_BY_MIME];
  if (!extension) throw new Error('Foto Service wajib berformat JPEG, PNG, atau WebP.');
  if (file.size > PUBLIC_SERVICE_IMAGE_MAX_BYTES) throw new Error('Ukuran foto Service maksimal 5 MiB.');
  return `${PUBLIC_SERVICE_CATEGORY_FOLDER}/${crypto.randomUUID()}.${extension}`;
}

export async function createPublicServiceSvgPath(file: Pick<File, 'name' | 'size' | 'type' | 'text'>) {
  if (!file.name.toLowerCase().endsWith('.svg') || (file.type && file.type !== 'image/svg+xml')) {
    throw new Error('Icon Sub-service wajib berupa file SVG.');
  }
  if (file.size > PUBLIC_SERVICE_SVG_MAX_BYTES) throw new Error('Ukuran icon SVG maksimal 512 KiB.');

  const markup = await file.text();
  const document = new DOMParser().parseFromString(markup, 'image/svg+xml');
  if (!document.documentElement || document.documentElement.tagName.toLowerCase() !== 'svg' || document.querySelector('parsererror')) {
    throw new Error('Isi file SVG tidak valid.');
  }
  if (/<(?:script|foreignObject|iframe|object|embed)\b|\son[a-z]+\s*=|javascript:|\b(?:href|xlink:href)\s*=\s*["'](?!#)/i.test(markup)) {
    throw new Error('SVG mengandung elemen atau referensi eksternal yang tidak diizinkan.');
  }

  return `${PUBLIC_SERVICE_ITEM_FOLDER}/${crypto.randomUUID()}.svg`;
}

export function publicServiceAssetUrlToPath(publicUrl: string) {
  const marker = `/storage/v1/object/public/${PUBLIC_SERVICE_ASSET_BUCKET}/`;
  const markerIndex = publicUrl.indexOf(marker);
  if (markerIndex < 0) return null;
  const path = publicUrl.slice(markerIndex + marker.length).split('?')[0];
  return path.startsWith('services/') ? path : null;
}
