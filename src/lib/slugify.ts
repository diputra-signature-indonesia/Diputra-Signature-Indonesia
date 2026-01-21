export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      // ganti & jadi "and" (opsional, SEO lebih bagus)
      .replace(/&/g, 'and')
      // buang semua karakter selain huruf, angka, spasi, dan dash
      .replace(/[^a-z0-9\s-]/g, '')
      // spasi jadi dash
      .replace(/\s+/g, '-')
      // rapikan dash berlebih
      .replace(/-+/g, '-')
  );
}
