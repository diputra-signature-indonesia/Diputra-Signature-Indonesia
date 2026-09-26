'use server';

import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { PUBLIC_CACHE_TAGS } from '@/lib/public-cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.generated';
import { revalidatePath, updateTag } from 'next/cache';

type CategoryType = Database['public']['Enums']['categories_type'];
type CtaType = Database['public']['Enums']['cta_type'];
export type PublicServiceActionResult = { ok: true; message: string } | { ok: false; message: string };

export type SavePublicServiceCategoryInput = {
  id?: string;
  expectedVersion?: number;
  slug: string;
  title: string;
  type: CategoryType;
  shortDescription: string;
  description: string;
  heroHeading: string;
  heroImage: string;
  cardImage: string;
  cardIconKey: string;
  seoTitle: string;
  seoDescription: string;
  ogImage: string;
  sortOrder: number;
  isPublished: boolean;
};

export type SavePublicServiceItemInput = {
  id?: string;
  expectedVersion?: number;
  categoryId: string;
  slug: string;
  title: string;
  description: string;
  iconKey: string;
  ctaLabel: string;
  ctaType: CtaType;
  seoTitle: string;
  seoDescription: string;
  ogImage: string;
  sortOrder: number;
  isPublished: boolean;
};

export type SavePublicServiceDetailInput = {
  id?: string;
  expectedVersion?: number;
  serviceItemId: string;
  title: string;
  description: string;
  ctaDescription: string;
  sortOrder: number;
  isPublished: boolean;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function requireServiceManager() {
  const context = await requireActiveAdmin();
  if (context.role !== 'admin' && context.role !== 'super_admin') return null;
  return context;
}

function validMutationIdentity(id?: string, version?: number) {
  return !id || (UUID_PATTERN.test(id) && Number.isInteger(version) && (version ?? 0) > 0);
}

function validOrder(value: number) {
  return Number.isSafeInteger(value) && value >= 0;
}

function validUrl(value: string) {
  if (!value) return true;
  if (value.length > 2048) return false;
  try {
    return new URL(value).protocol === 'https:' || new URL(value).protocol === 'http:';
  } catch {
    return false;
  }
}

function withinLimit(value: string, maxLength: number) {
  return value.trim().length <= maxLength;
}

function refreshPublicServices() {
  revalidatePath('/admin/public-services');
  revalidatePath('/services', 'layout');
  revalidatePath('/');
  updateTag(PUBLIC_CACHE_TAGS.services);
}

function mutationError(error: { code?: string; message: string }): PublicServiceActionResult {
  if (error.code === '42501') return { ok: false, message: 'Hanya admin atau super admin yang dapat mengelola Client Services.' };
  if (error.code === '23505') return { ok: false, message: 'Slug atau urutan tersebut sudah digunakan.' };
  if (error.code === '23503') return { ok: false, message: 'Data induk tidak ditemukan atau sudah dihapus.' };
  if (error.code === '23514') return { ok: false, message: 'Icon SVG wajib diunggah sebelum Sub-service disimpan.' };
  if (error.code === '40001') return { ok: false, message: 'Data telah berubah. Muat ulang halaman lalu coba kembali.' };
  return { ok: false, message: 'Perubahan Client Services gagal disimpan. Periksa kembali data form.' };
}

export async function savePublicServiceCategoryAction(input: SavePublicServiceCategoryInput): Promise<PublicServiceActionResult> {
  if (!(await requireServiceManager())) return { ok: false, message: 'Hanya admin atau super admin yang dapat mengelola Client Services.' };
  const slug = input.slug.trim().toLowerCase();
  const title = input.title.trim();
  if (!validMutationIdentity(input.id, input.expectedVersion) || !SLUG_PATTERN.test(slug) || slug.length > 100 || !title || title.length > 160 || !validOrder(input.sortOrder)) {
    return { ok: false, message: 'Judul, slug, urutan, atau versi Service tidak valid.' };
  }
  if (!['primary', 'secondary'].includes(input.type)) return { ok: false, message: 'Tipe Service tidak valid.' };
  if (![input.heroImage, input.cardImage, input.ogImage].every((value) => validUrl(value.trim()))) return { ok: false, message: 'URL gambar Service tidak valid.' };
  if (
    !withinLimit(input.shortDescription, 500) ||
    !withinLimit(input.description, 2000) ||
    !withinLimit(input.heroHeading, 200) ||
    !withinLimit(input.cardIconKey, 80) ||
    !withinLimit(input.seoTitle, 200) ||
    !withinLimit(input.seoDescription, 500)
  ) {
    return { ok: false, message: 'Konten Service melebihi batas karakter.' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('save_public_service_category', {
    p_id: input.id ?? null,
    p_expected_version: input.expectedVersion ?? null,
    p_slug: slug,
    p_title: title,
    p_type: input.type,
    p_short_description: input.shortDescription.trim() || null,
    p_description: input.description.trim() || null,
    p_hero_heading: input.heroHeading.trim() || null,
    p_hero_image: input.heroImage.trim() || null,
    p_card_image: input.cardImage.trim() || null,
    p_card_icon_key: input.cardIconKey.trim() || null,
    p_seo_title: input.seoTitle.trim() || null,
    p_seo_description: input.seoDescription.trim() || null,
    p_og_image: input.ogImage.trim() || null,
    p_sort_order: input.sortOrder,
    p_is_published: input.isPublished,
  } as never);
  if (error) return mutationError(error);
  refreshPublicServices();
  return { ok: true, message: input.id ? 'Service berhasil diperbarui.' : 'Service berhasil ditambahkan.' };
}

export async function savePublicServiceItemAction(input: SavePublicServiceItemInput): Promise<PublicServiceActionResult> {
  if (!(await requireServiceManager())) return { ok: false, message: 'Hanya admin atau super admin yang dapat mengelola Client Services.' };
  const slug = input.slug.trim().toLowerCase();
  const title = input.title.trim();
  if (
    !validMutationIdentity(input.id, input.expectedVersion) ||
    !UUID_PATTERN.test(input.categoryId) ||
    !SLUG_PATTERN.test(slug) ||
    slug.length > 100 ||
    !title ||
    title.length > 160 ||
    !validOrder(input.sortOrder)
  ) {
    return { ok: false, message: 'Data Sub-service tidak valid.' };
  }
  if (!input.iconKey.trim()) return { ok: false, message: 'Icon SVG Sub-service wajib diunggah.' };
  if (input.iconKey.startsWith('http') && !validUrl(input.iconKey.trim())) return { ok: false, message: 'URL icon SVG tidak valid.' };
  if (!['contact', 'detail'].includes(input.ctaType)) return { ok: false, message: 'Tipe CTA tidak valid.' };
  if (!validUrl(input.ogImage.trim())) return { ok: false, message: 'URL OG Image tidak valid.' };
  if (!withinLimit(input.description, 2000) || !withinLimit(input.iconKey, 2048) || !withinLimit(input.ctaLabel, 80) || !withinLimit(input.seoTitle, 200) || !withinLimit(input.seoDescription, 500)) {
    return { ok: false, message: 'Konten Sub-service melebihi batas karakter.' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('save_public_service_item', {
    p_id: input.id ?? null,
    p_expected_version: input.expectedVersion ?? null,
    p_category_id: input.categoryId,
    p_slug: slug,
    p_title: title,
    p_description: input.description.trim() || null,
    p_icon_key: input.iconKey.trim(),
    p_cta_label: input.ctaLabel.trim() || 'Contact',
    p_cta_type: input.ctaType,
    p_seo_title: input.seoTitle.trim() || null,
    p_seo_description: input.seoDescription.trim() || null,
    p_og_image: input.ogImage.trim() || null,
    p_sort_order: input.sortOrder,
    p_is_published: input.isPublished,
  } as never);
  if (error) return mutationError(error);
  refreshPublicServices();
  return { ok: true, message: input.id ? 'Sub-service berhasil diperbarui.' : 'Sub-service berhasil ditambahkan.' };
}

export async function savePublicServiceDetailAction(input: SavePublicServiceDetailInput): Promise<PublicServiceActionResult> {
  if (!(await requireServiceManager())) return { ok: false, message: 'Hanya admin atau super admin yang dapat mengelola Client Services.' };
  if (!validMutationIdentity(input.id, input.expectedVersion) || !UUID_PATTERN.test(input.serviceItemId) || !input.title.trim() || input.title.trim().length > 160 || !validOrder(input.sortOrder)) {
    return { ok: false, message: 'Data detail Sub-service tidak valid.' };
  }
  if (!withinLimit(input.description, 2000) || !withinLimit(input.ctaDescription, 120)) {
    return { ok: false, message: 'Konten detail Sub-service melebihi batas karakter.' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('save_public_service_detail', {
    p_id: input.id ?? null,
    p_expected_version: input.expectedVersion ?? null,
    p_service_item_id: input.serviceItemId,
    p_title: input.title.trim(),
    p_description: input.description.trim() || null,
    p_cta_description: input.ctaDescription.trim() || null,
    p_sort_order: input.sortOrder,
    p_is_published: input.isPublished,
  } as never);
  if (error) return mutationError(error);
  refreshPublicServices();
  return { ok: true, message: input.id ? 'Detail Sub-service berhasil diperbarui.' : 'Detail Sub-service berhasil ditambahkan.' };
}

export async function deletePublicServiceAction(kind: 'category' | 'item' | 'detail', id: string, expectedVersion: number): Promise<PublicServiceActionResult> {
  if (!(await requireServiceManager())) return { ok: false, message: 'Hanya admin atau super admin yang dapat mengelola Client Services.' };
  if (!UUID_PATTERN.test(id) || !Number.isInteger(expectedVersion) || expectedVersion < 1) return { ok: false, message: 'Data yang akan dihapus tidak valid.' };
  const supabase = await createSupabaseServerClient();
  const result =
    kind === 'category'
      ? await supabase.rpc('delete_public_service_category', { p_id: id, p_expected_version: expectedVersion })
      : kind === 'item'
        ? await supabase.rpc('delete_public_service_item', { p_id: id, p_expected_version: expectedVersion })
        : await supabase.rpc('delete_public_service_detail', { p_id: id, p_expected_version: expectedVersion });
  if (result.error) return mutationError(result.error);
  refreshPublicServices();
  return {
    ok: true,
    message:
      kind === 'category' ? 'Service dan seluruh turunannya berhasil dihapus.' : kind === 'item' ? 'Sub-service dan seluruh detailnya berhasil dihapus.' : 'Detail Sub-service berhasil dihapus.',
  };
}
