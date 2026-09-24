'use server';

import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database.generated';
import { revalidatePath } from 'next/cache';

type ActionResult<T = undefined> = { ok: true; message: string; data: T } | { ok: false; message: string };
type PriceInput = { itemName: string; amount: number; notes: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const FLOW_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

function failure(error: { code?: string; message: string }, fallback: string): { ok: false; message: string } {
  if (error.code === '42501') return { ok: false, message: 'Hanya admin atau super admin aktif yang dapat mengubah SOP.' };
  if (error.code === '40001') return { ok: false, message: 'SOP sudah diubah pengguna lain. Muat ulang halaman lalu coba kembali.' };
  if (error.code === 'P0002') return { ok: false, message: 'Data SOP tidak ditemukan. Muat ulang halaman lalu coba kembali.' };
  if (error.code === '23503') return { ok: false, message: 'Internal Service atau data SOP tidak tersedia.' };
  if (error.code === '22023') return { ok: false, message: error.message || fallback };
  return { ok: false, message: fallback };
}

async function managerClient() {
  const actor = await requireActiveAdmin();
  if (actor.role !== 'admin' && actor.role !== 'super_admin') return null;
  return createSupabaseServerClient();
}

async function findOrCreateSop(serviceId: string, description: string | null) {
  const supabase = await createSupabaseServerClient();
  const current = await supabase.from('sops').select('id,version').eq('internal_service_id', serviceId).maybeSingle();
  if (current.error) return { error: current.error, sop: null };
  if (current.data) return { error: null, sop: current.data };

  const created = await supabase.rpc('save_sop', { p_internal_service_id: serviceId, p_description: description ?? '' });
  if (created.error) return { error: created.error, sop: null };
  const sop = await supabase.from('sops').select('id,version').eq('id', created.data).single();
  return { error: sop.error, sop: sop.data };
}

export async function saveSopDescriptionAction(input: { serviceId: string; description: string; expectedVersion: number | null }): Promise<ActionResult<{ sopId: string; version: number }>> {
  const supabase = await managerClient();
  if (!supabase) return { ok: false, message: 'Hanya admin atau super admin yang dapat mengubah SOP.' };
  const description = input.description.trim();
  if (!UUID_PATTERN.test(input.serviceId) || description.length > 10_000 || (input.expectedVersion !== null && (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 1))) {
    return { ok: false, message: 'Data deskripsi SOP tidak valid.' };
  }
  const args = input.expectedVersion === null
    ? { p_internal_service_id: input.serviceId, p_description: description }
    : { p_internal_service_id: input.serviceId, p_description: description, p_expected_version: input.expectedVersion };
  const result = await supabase.rpc('save_sop', args);
  if (result.error) return failure(result.error, 'Deskripsi SOP gagal disimpan.');
  const refreshed = await supabase.from('sops').select('id,version').eq('id', result.data).single();
  if (refreshed.error) return failure(refreshed.error, 'Deskripsi tersimpan, tetapi versi terbaru gagal dibaca.');
  revalidatePath('/admin/sop');
  return { ok: true, message: 'Deskripsi SOP berhasil disimpan.', data: { sopId: refreshed.data.id, version: refreshed.data.version } };
}

export async function saveSopPriceItemsAction(input: { serviceId: string; description: string | null; expectedVersion: number | null; items: PriceInput[] }): Promise<ActionResult<{ version: number }>> {
  const supabase = await managerClient();
  if (!supabase) return { ok: false, message: 'Hanya admin atau super admin yang dapat mengubah SOP.' };
  if (!UUID_PATTERN.test(input.serviceId) || input.items.length > 100 || input.items.some((item) => !item.itemName.trim() || item.itemName.trim().length > 240 || !Number.isSafeInteger(item.amount) || item.amount < 0 || item.notes.trim().length > 1000)) {
    return { ok: false, message: 'Setiap Price List memerlukan nama dan nominal IDR berupa angka bulat nol atau lebih.' };
  }
  const ensured = await findOrCreateSop(input.serviceId, input.description);
  if (ensured.error || !ensured.sop) return failure(ensured.error ?? { message: 'SOP tidak tersedia.' }, 'SOP gagal disiapkan.');
  if (input.expectedVersion !== null && input.expectedVersion !== ensured.sop.version) return { ok: false, message: 'SOP sudah diubah pengguna lain. Muat ulang halaman lalu coba kembali.' };
  const items = input.items.map((item) => ({ item_name: item.itemName.trim(), amount: item.amount, notes: item.notes.trim() || null })) as Json;
  const result = await supabase.rpc('save_sop_price_items', { p_sop_id: ensured.sop.id, p_sop_expected_version: ensured.sop.version, p_items: items });
  if (result.error) return failure(result.error, 'Price List gagal disimpan.');
  revalidatePath('/admin/sop');
  return { ok: true, message: 'Price List berhasil disimpan.', data: { version: result.data } };
}

export async function prepareSopFileUploadAction(input: {
  serviceId: string; description: string | null; fileType: 'FLOW' | 'REQUIREMENT'; title: string;
  originalFilename: string; mimeType: string; sizeBytes: number; sortOrder: number;
}): Promise<ActionResult<{ sopId: string; fileId: string; bucketId: string; storagePath: string; version: number }>> {
  const supabase = await managerClient();
  if (!supabase) return { ok: false, message: 'Hanya admin atau super admin yang dapat mengunggah file SOP.' };
  const title = input.title.trim();
  const validMime = input.fileType === 'FLOW' ? FLOW_TYPES.has(input.mimeType) : input.mimeType === 'application/pdf';
  if (!UUID_PATTERN.test(input.serviceId) || !title || title.length > 240 || !input.originalFilename.trim() || input.originalFilename.length > 255 || !validMime || !Number.isSafeInteger(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > MAX_FILE_SIZE || !Number.isInteger(input.sortOrder) || input.sortOrder < 0) {
    return { ok: false, message: 'File tidak valid. Gunakan tipe yang didukung dengan ukuran maksimal 10 MiB.' };
  }
  const ensured = await findOrCreateSop(input.serviceId, input.description);
  if (ensured.error || !ensured.sop) return failure(ensured.error ?? { message: 'SOP tidak tersedia.' }, 'SOP gagal disiapkan untuk upload.');
  const reservation = await supabase.rpc('prepare_sop_file_upload', {
    p_sop_id: ensured.sop.id,
    p_file_type: input.fileType,
    p_title: title,
    p_original_filename: input.originalFilename.trim(),
    p_mime_type: input.mimeType,
    p_size_bytes: input.sizeBytes,
    p_sort_order: input.sortOrder,
  });
  if (reservation.error) return failure(reservation.error, 'Reservasi upload file SOP gagal dibuat.');
  const row = reservation.data?.[0];
  if (!row) return { ok: false, message: 'Reservasi upload tidak mengembalikan lokasi file.' };
  return { ok: true, message: 'Lokasi upload berhasil disiapkan.', data: { sopId: ensured.sop.id, fileId: row.file_id, bucketId: row.bucket_id, storagePath: row.storage_path, version: 1 } };
}

export async function finalizeSopFileUploadAction(input: { fileId: string; expectedVersion: number }): Promise<ActionResult<{ version: number }>> {
  const supabase = await managerClient();
  if (!supabase) return { ok: false, message: 'Hanya admin atau super admin yang dapat mengunggah file SOP.' };
  if (!UUID_PATTERN.test(input.fileId) || !Number.isInteger(input.expectedVersion) || input.expectedVersion < 1) return { ok: false, message: 'Reservasi upload tidak valid.' };
  const reservation = await supabase.from('sop_files').select('sop_id,file_type,bucket_id,storage_path').eq('id', input.fileId).maybeSingle();
  if (reservation.error || !reservation.data) return failure(reservation.error ?? { message: 'Reservasi upload tidak ditemukan.' }, 'Reservasi upload tidak ditemukan.');
  const previousFlow = reservation.data.file_type === 'FLOW'
    ? await supabase.from('sop_files').select('bucket_id,storage_path').eq('sop_id', reservation.data.sop_id).eq('file_type', 'FLOW').eq('upload_status', 'READY').is('deleted_at', null).neq('id', input.fileId).order('uploaded_at', { ascending: false }).limit(1).maybeSingle()
    : null;
  if (previousFlow?.error) return failure(previousFlow.error, 'Flow lama gagal diperiksa. Upload belum difinalisasi.');
  const result = await supabase.rpc('finalize_sop_file_upload', { p_file_id: input.fileId, p_expected_version: input.expectedVersion });
  if (result.error) {
    await supabase.rpc('fail_sop_file_upload', { p_file_id: input.fileId, p_expected_version: input.expectedVersion });
    await supabase.storage.from(reservation.data.bucket_id).remove([reservation.data.storage_path]);
    return failure(result.error, 'Finalisasi file gagal. Object upload yang belum valid telah dibersihkan.');
  }
  const cleanup = previousFlow?.data
    ? await supabase.storage.from(previousFlow.data.bucket_id).remove([previousFlow.data.storage_path])
    : null;
  revalidatePath('/admin/sop');
  return {
    ok: true,
    message: cleanup?.error ? 'File SOP berhasil diunggah. Pembersihan Flow lama perlu dicoba kembali.' : 'File SOP berhasil diunggah.',
    data: { version: result.data },
  };
}

export async function failSopFileUploadAction(input: { fileId: string; expectedVersion: number }): Promise<void> {
  const supabase = await managerClient();
  if (!supabase || !UUID_PATTERN.test(input.fileId)) return;
  await supabase.rpc('fail_sop_file_upload', { p_file_id: input.fileId, p_expected_version: input.expectedVersion });
}

export async function deleteSopFileAction(input: { fileId: string; expectedVersion: number }): Promise<ActionResult> {
  const supabase = await managerClient();
  if (!supabase) return { ok: false, message: 'Hanya admin atau super admin yang dapat menghapus file SOP.' };
  if (!UUID_PATTERN.test(input.fileId) || !Number.isInteger(input.expectedVersion) || input.expectedVersion < 1) return { ok: false, message: 'File SOP tidak valid.' };
  const marked = await supabase.rpc('mark_sop_file_deleted', { p_file_id: input.fileId, p_expected_version: input.expectedVersion });
  if (marked.error) return failure(marked.error, 'File SOP gagal dihapus.');
  const removed = await supabase.storage.from('sop-documents').remove([marked.data]);
  revalidatePath('/admin/sop');
  return {
    ok: true,
    message: removed.error ? 'File disembunyikan dari SOP. Pembersihan object Storage perlu dicoba kembali.' : 'File SOP berhasil dihapus.',
    data: undefined,
  };
}
