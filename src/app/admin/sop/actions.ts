'use server';

import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { getGoogleDriveConfig } from '@/lib/google-drive/auth';
import {
  createResumableUpload,
  createSopFolder,
  generateDriveFileId,
  findSopFolder,
  getDriveFile,
  GoogleDriveApiError,
  googleFolderUrl,
  trashDriveFile,
} from '@/lib/google-drive/client';
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

function driveFailure(error: unknown, fallback: string): { ok: false; message: string } {
  if (error instanceof GoogleDriveApiError) {
    if (error.status === 403) return { ok: false, message: 'Google Drive menolak operasi ini. Periksa akses service account pada Shared Drive.' };
    if (error.status === 404) return { ok: false, message: 'Folder atau file SOP tidak ditemukan di Google Drive.' };
  }
  if (error instanceof Error && error.message.includes('is not configured')) {
    return { ok: false, message: 'Konfigurasi Google Drive SOP belum tersedia pada environment ini.' };
  }
  if (error instanceof Error && error.message.includes('Vercel OIDC token is unavailable')) {
    return { ok: false, message: 'Google Drive melalui OIDC hanya tersedia pada deployment Vercel yang telah diotorisasi.' };
  }
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

function sopFolderName(serviceName: string, sopId: string) {
  const clean = serviceName.replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();
  return `${clean || 'SOP'} (${sopId.slice(0, 8)})`.slice(0, 240);
}

async function ensureSopDriveFolder(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  sopId: string,
  serviceName: string,
) {
  const current = await supabase.from('sop_drive_folders')
    .select('id,sop_id,google_drive_id,google_folder_id,folder_name,web_view_url,connection_status')
    .eq('sop_id', sopId)
    .maybeSingle();
  if (current.error) return { ok: false as const, result: failure(current.error, 'Mapping folder SOP gagal dibaca.') };
  if (current.data?.connection_status === 'READY') return { ok: true as const, folder: current.data };

  try {
    const config = getGoogleDriveConfig();
    const driveFolder = await findSopFolder(sopId) ?? await createSopFolder(sopId, sopFolderName(serviceName, sopId));
    const webViewUrl = driveFolder.webViewLink ?? googleFolderUrl(driveFolder.id);
    const saved = await supabase.rpc('save_sop_drive_folder', {
      p_sop_id: sopId,
      p_google_drive_id: config.sharedDriveId,
      p_google_folder_id: driveFolder.id,
      p_folder_name: driveFolder.name,
      p_web_view_url: webViewUrl,
    });
    if (saved.error) return { ok: false as const, result: failure(saved.error, 'Folder SOP berhasil dibuat di Drive, tetapi mapping database gagal disimpan.') };
    return {
      ok: true as const,
      folder: {
        id: saved.data,
        sop_id: sopId,
        google_drive_id: config.sharedDriveId,
        google_folder_id: driveFolder.id,
        folder_name: driveFolder.name,
        web_view_url: webViewUrl,
        connection_status: 'READY',
      },
    };
  } catch (error) {
    return { ok: false as const, result: driveFailure(error, 'Folder SOP gagal disiapkan di Google Drive.') };
  }
}

export async function prepareSopFileUploadAction(input: {
  serviceId: string; description: string | null; fileType: 'FLOW' | 'REQUIREMENT'; title: string;
  originalFilename: string; mimeType: string; sizeBytes: number; sortOrder: number;
}): Promise<ActionResult<{ sopId: string; folderId: string; uploadUrl: string; googleFileId: string }>> {
  const supabase = await managerClient();
  if (!supabase) return { ok: false, message: 'Hanya admin atau super admin yang dapat mengunggah file SOP.' };
  const title = input.title.trim();
  const validMime = input.fileType === 'FLOW' ? FLOW_TYPES.has(input.mimeType) : input.mimeType === 'application/pdf';
  if (!UUID_PATTERN.test(input.serviceId) || !title || title.length > 240 || !input.originalFilename.trim() || input.originalFilename.length > 255 || !validMime || !Number.isSafeInteger(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > MAX_FILE_SIZE || !Number.isInteger(input.sortOrder) || input.sortOrder < 0) {
    return { ok: false, message: 'File tidak valid. Gunakan tipe yang didukung dengan ukuran maksimal 10 MiB.' };
  }
  const ensured = await findOrCreateSop(input.serviceId, input.description);
  if (ensured.error || !ensured.sop) return failure(ensured.error ?? { message: 'SOP tidak tersedia.' }, 'SOP gagal disiapkan untuk upload.');
  const service = await supabase.from('internal_services').select('name').eq('id', input.serviceId).maybeSingle();
  if (service.error || !service.data) return failure(service.error ?? { message: 'Internal Service tidak ditemukan.' }, 'Internal Service gagal dibaca.');
  const folder = await ensureSopDriveFolder(supabase, ensured.sop.id, service.data.name);
  if (!folder.ok) return folder.result;
  try {
    const googleFileId = await generateDriveFileId();
    const uploadUrl = await createResumableUpload(folder.folder.google_folder_id, googleFileId, input.originalFilename.trim(), input.mimeType, input.sizeBytes);
    return { ok: true, message: 'Sesi upload Google Drive siap.', data: { sopId: ensured.sop.id, folderId: folder.folder.id, uploadUrl, googleFileId } };
  } catch (error) {
    return driveFailure(error, 'Sesi upload file SOP gagal dibuat di Google Drive.');
  }
}

export async function finalizeSopFileUploadAction(input: {
  sopId: string;
  folderId: string;
  fileType: 'FLOW' | 'REQUIREMENT';
  title: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  sortOrder: number;
  googleFileId: string;
}): Promise<ActionResult<{ fileId: string }>> {
  const supabase = await managerClient();
  if (!supabase) return { ok: false, message: 'Hanya admin atau super admin yang dapat mengunggah file SOP.' };
  if (!UUID_PATTERN.test(input.sopId) || !UUID_PATTERN.test(input.folderId) || !input.googleFileId.trim()) return { ok: false, message: 'Hasil upload Google Drive tidak valid.' };
  try {
    const config = getGoogleDriveConfig();
    const folder = await supabase.from('sop_drive_folders').select('google_folder_id').eq('id', input.folderId).eq('sop_id', input.sopId).maybeSingle();
    if (folder.error || !folder.data) return failure(folder.error ?? { message: 'Folder SOP tidak ditemukan.' }, 'Folder SOP tidak ditemukan.');
    const file = await getDriveFile(input.googleFileId.trim());
    if (file.trashed || file.driveId !== config.sharedDriveId || !file.parents?.includes(folder.data.google_folder_id) || !file.webViewLink || file.name !== input.originalFilename || file.mimeType !== input.mimeType || Number(file.size ?? 0) !== input.sizeBytes) {
      await trashDriveFile(input.googleFileId.trim()).catch(() => undefined);
      return { ok: false, message: 'File hasil upload tidak sesuai atau tidak berada pada folder SOP yang benar.' };
    }
    const previousFlow = input.fileType === 'FLOW'
      ? await supabase.from('sop_files').select('storage_provider,google_file_id').eq('sop_id', input.sopId).eq('file_type', 'FLOW').eq('upload_status', 'READY').is('deleted_at', null).limit(1).maybeSingle()
      : null;
    if (previousFlow?.error) return failure(previousFlow.error, 'Flow lama gagal diperiksa.');
    const saved = await supabase.rpc('save_sop_drive_file_metadata', {
      p_sop_id: input.sopId,
      p_sop_drive_folder_id: input.folderId,
      p_file_type: input.fileType,
      p_title: input.title,
      p_original_filename: file.name,
      p_mime_type: file.mimeType,
      p_size_bytes: Number(file.size),
      p_sort_order: input.sortOrder,
      p_google_file_id: file.id,
      p_google_resource_key: file.resourceKey ?? '',
      p_web_view_url: file.webViewLink,
    });
    if (saved.error) {
      await trashDriveFile(file.id).catch(() => undefined);
      return failure(saved.error, 'Metadata file SOP gagal disimpan. File upload telah dipindahkan ke Trash Drive.');
    }
    let cleanupFailed = false;
    if (previousFlow?.data?.storage_provider === 'GOOGLE_DRIVE' && previousFlow.data.google_file_id && previousFlow.data.google_file_id !== file.id) {
      cleanupFailed = await trashDriveFile(previousFlow.data.google_file_id).then(() => false).catch(() => true);
    }
    revalidatePath('/admin/sop');
    return {
      ok: true,
      message: cleanupFailed ? 'File SOP berhasil diunggah. Flow lama masih perlu dipindahkan ke Trash Drive.' : 'File SOP berhasil diunggah.',
      data: { fileId: saved.data },
    };
  } catch (error) {
    if (error instanceof GoogleDriveApiError && error.status === 404) return { ok: false, message: 'Upload belum tersimpan di Google Drive. Periksa koneksi dan coba kembali.' };
    return driveFailure(error, 'File berhasil diunggah, tetapi metadata Google Drive gagal diverifikasi.');
  }
}

export async function deleteSopFileAction(input: { fileId: string; expectedVersion: number }): Promise<ActionResult> {
  const supabase = await managerClient();
  if (!supabase) return { ok: false, message: 'Hanya admin atau super admin yang dapat menghapus file SOP.' };
  if (!UUID_PATTERN.test(input.fileId) || !Number.isInteger(input.expectedVersion) || input.expectedVersion < 1) return { ok: false, message: 'File SOP tidak valid.' };
  const file = await supabase.from('sop_files').select('storage_provider,google_file_id').eq('id', input.fileId).is('deleted_at', null).maybeSingle();
  if (file.error || !file.data) return failure(file.error ?? { message: 'File SOP tidak ditemukan.' }, 'File SOP tidak ditemukan.');
  try {
    if (file.data.storage_provider === 'GOOGLE_DRIVE' && file.data.google_file_id) await trashDriveFile(file.data.google_file_id);
    const archived = await supabase.rpc('archive_sop_file', { p_file_id: input.fileId, p_expected_version: input.expectedVersion });
    if (archived.error) return failure(archived.error, file.data.storage_provider === 'GOOGLE_DRIVE' ? 'File sudah dipindahkan ke Trash Drive, tetapi metadata database belum diperbarui.' : 'File SOP gagal dihapus.');
    revalidatePath('/admin/sop');
    return { ok: true, message: 'File SOP berhasil dihapus.', data: undefined };
  } catch (error) {
    return driveFailure(error, 'File SOP gagal dipindahkan ke Trash Drive.');
  }
}
