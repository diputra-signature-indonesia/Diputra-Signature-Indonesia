'use server';

import { requireActiveAdmin } from '@/lib/auth/admin-access';
import {
  createDrivePermission,
  createJobFolder,
  createResumableUpload,
  deleteDrivePermission,
  findJobFolder,
  generateDriveFileId,
  getDriveFile,
  GoogleDriveApiError,
  googleFolderUrl,
  listDrivePermissions,
  trashDriveFile,
  updateDrivePermission,
} from '@/lib/google-drive/client';
import { getGoogleDriveConfig, GoogleDriveConfigurationError } from '@/lib/google-drive/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const MUTABLE_ROLES = new Set(['reader', 'commenter', 'writer']);

type Result<T = undefined> = { ok: true; message: string; data: T } | { ok: false; message: string };
type PermissionRole = 'reader' | 'commenter' | 'writer';

export type JobFolderPermission = {
  id: string;
  type: string;
  role: string;
  displayName: string;
  emailAddress: string | null;
  photoLink: string | null;
  inherited: boolean;
  canModify: boolean;
};

export type JobAccessUserOption = {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
};

function fail(message: string): { ok: false; message: string } {
  return { ok: false, message };
}

function driveFailure(error: unknown, fallback: string) {
  if (error instanceof GoogleDriveConfigurationError) return fail('Konfigurasi Google Drive belum tersedia pada environment ini.');
  if (error instanceof GoogleDriveApiError) {
    if (error.status === 403) return fail('Google Drive menolak operasi ini. Periksa akses service account dan kebijakan Shared Drive.');
    if (error.status === 404) return fail('Folder atau file tidak ditemukan di Google Drive.');
    if (error.status === 409) return fail('Akses atau file tersebut sudah tersedia di Google Drive.');
  }
  return fail(fallback);
}

function refresh(jobId: string) {
  revalidatePath(`/admin/all-jobs/${jobId}`);
}

async function requireManager(jobId: string) {
  const actor = await requireActiveAdmin();
  if (!UUID.test(jobId)) return { ok: false, result: fail('Job tidak valid.') } as const;
  const supabase = await createSupabaseServerClient();
  const job = await supabase.from('jobs').select('id,title,pic_id').eq('id', jobId).is('archived_at', null).maybeSingle();
  if (job.error || !job.data) return { ok: false, result: fail('Job tidak ditemukan.') } as const;
  const canManage = actor.role === 'admin' || actor.role === 'super_admin' || actor.userId === job.data.pic_id;
  if (!canManage) return { ok: false, result: fail('Hanya PIC Job, admin, atau super admin yang dapat mengelola dokumen.') } as const;
  return { ok: true, actor, supabase, job: job.data } as const;
}

function folderName(title: string, jobId: string) {
  const clean = title.replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();
  return `${clean || 'Job'} (${jobId.slice(0, 8)})`.slice(0, 240);
}

async function ensureFolder(jobId: string) {
  const context = await requireManager(jobId);
  if (!context.ok) return context;
  const current = await context.supabase.from('job_drive_folders')
    .select('id,google_folder_id,google_drive_id,folder_name,web_view_url,connection_status')
    .eq('job_id', jobId).is('archived_at', null).maybeSingle();
  if (current.error) return { ok: false, result: fail('Mapping folder Job gagal dibaca.') } as const;
  if (current.data?.connection_status === 'READY') return { ...context, folder: current.data } as const;

  try {
    const config = getGoogleDriveConfig();
    const driveFolder = await findJobFolder(jobId) ?? await createJobFolder(jobId, folderName(context.job.title, jobId));
    const webViewUrl = driveFolder.webViewLink ?? googleFolderUrl(driveFolder.id);
    const saved = await context.supabase.rpc('save_job_drive_folder', {
      p_job_id: jobId,
      p_google_drive_id: config.sharedDriveId,
      p_google_folder_id: driveFolder.id,
      p_folder_name: driveFolder.name,
      p_web_view_url: webViewUrl,
    });
    if (saved.error) return { ok: false, result: fail('Folder berhasil disiapkan di Drive, tetapi mapping database gagal disimpan.') } as const;
    return {
      ...context,
      folder: {
        id: saved.data,
        google_folder_id: driveFolder.id,
        google_drive_id: config.sharedDriveId,
        folder_name: driveFolder.name,
        web_view_url: webViewUrl,
        connection_status: 'READY',
      },
    } as const;
  } catch (error) {
    return { ok: false, result: driveFailure(error, 'Folder Job gagal disiapkan di Google Drive.') } as const;
  }
}

export async function ensureJobDriveFolderAction(jobId: string): Promise<Result<{ folderUrl: string }>> {
  const result = await ensureFolder(jobId);
  if (!result.ok) return result.result;
  refresh(jobId);
  return { ok: true, message: 'Folder Job siap digunakan.', data: { folderUrl: result.folder.web_view_url } };
}

export async function prepareJobDocumentUploadAction(input: {
  jobId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<Result<{ uploadUrl: string; googleFileId: string; folderId: string; maxUploadBytes: number }>> {
  const name = input.fileName.replace(/[\u0000-\u001f]/g, ' ').trim();
  const mimeType = input.mimeType.trim() || 'application/octet-stream';
  if (!UUID.test(input.jobId) || !name || name.length > 500 || !Number.isSafeInteger(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > MAX_UPLOAD_BYTES) {
    return fail('File tidak valid atau melebihi batas 100 MiB.');
  }
  const result = await ensureFolder(input.jobId);
  if (!result.ok) return result.result;
  try {
    const googleFileId = await generateDriveFileId();
    const uploadUrl = await createResumableUpload(result.folder.google_folder_id, googleFileId, name, mimeType, input.sizeBytes);
    return { ok: true, message: 'Sesi upload siap.', data: { uploadUrl, googleFileId, folderId: result.folder.google_folder_id, maxUploadBytes: MAX_UPLOAD_BYTES } };
  } catch (error) {
    return driveFailure(error, 'Sesi upload Google Drive gagal dibuat.');
  }
}

export async function finalizeJobDocumentUploadAction(input: { jobId: string; googleFileId: string }): Promise<Result<{ documentId: string }>> {
  if (!UUID.test(input.jobId) || !input.googleFileId.trim()) return fail('Hasil upload tidak valid.');
  const result = await ensureFolder(input.jobId);
  if (!result.ok) return result.result;
  try {
    const config = getGoogleDriveConfig();
    const file = await getDriveFile(input.googleFileId.trim());
    if (file.trashed || file.driveId !== config.sharedDriveId || !file.parents?.includes(result.folder.google_folder_id) || !file.webViewLink) {
      return fail('File hasil upload tidak berada pada folder Job yang benar.');
    }
    const saved = await result.supabase.rpc('save_job_document_metadata', {
      p_job_id: input.jobId,
      p_job_drive_folder_id: result.folder.id,
      p_google_file_id: file.id,
      p_google_resource_key: file.resourceKey ?? '',
      p_file_name: file.name,
      p_mime_type: file.mimeType,
      p_file_size_bytes: Number(file.size ?? 0),
      p_web_view_url: file.webViewLink,
    });
    if (saved.error) {
      await trashDriveFile(file.id).catch(() => undefined);
      return fail('Metadata file gagal disimpan. File upload telah dipindahkan ke Trash.');
    }
    refresh(input.jobId);
    return { ok: true, message: 'Dokumen berhasil diunggah.', data: { documentId: saved.data } };
  } catch (error) {
    if (error instanceof GoogleDriveApiError && error.status === 404) return fail('Upload belum tersimpan di Google Drive. Periksa koneksi dan coba kembali.');
    return driveFailure(error, 'Upload selesai, tetapi metadata file gagal diverifikasi.');
  }
}

export async function deleteJobDocumentAction(input: { jobId: string; documentId: string; version: number }): Promise<Result> {
  if (!UUID.test(input.jobId) || !UUID.test(input.documentId) || !Number.isInteger(input.version) || input.version < 1) return fail('Dokumen tidak valid.');
  const context = await requireManager(input.jobId);
  if (!context.ok) return context.result;
  const document = await context.supabase.from('job_documents').select('id,job_id,google_file_id,version').eq('id', input.documentId).is('archived_at', null).maybeSingle();
  if (document.error || !document.data || document.data.job_id !== input.jobId) return fail('Dokumen tidak ditemukan.');
  if (document.data.version !== input.version) return fail('Dokumen sudah berubah. Muat ulang halaman.');
  try {
    await trashDriveFile(document.data.google_file_id);
    const archived = await context.supabase.rpc('archive_job_document', { p_document_id: input.documentId, p_expected_version: input.version });
    if (archived.error) return fail('File sudah dipindahkan ke Trash Drive, tetapi metadata database belum diperbarui.');
    refresh(input.jobId);
    return { ok: true, message: 'Dokumen dipindahkan ke Google Drive Trash.', data: undefined };
  } catch (error) {
    return driveFailure(error, 'Dokumen gagal dipindahkan ke Trash.');
  }
}

function normalizePermissions(permissions: Awaited<ReturnType<typeof listDrivePermissions>>) {
  const serviceAccount = process.env.GCP_SERVICE_ACCOUNT_EMAIL?.trim().toLowerCase();
  return permissions
    .filter((permission) => !permission.deleted)
    .map((permission): JobFolderPermission => {
      const inherited = permission.permissionDetails?.some((detail) => detail.inherited) ?? false;
      const email = permission.emailAddress?.toLowerCase() ?? null;
      return {
        id: permission.id,
        type: permission.type,
        role: permission.role,
        displayName: permission.displayName ?? permission.emailAddress ?? permission.type,
        emailAddress: permission.emailAddress ?? null,
        photoLink: permission.photoLink ?? null,
        inherited,
        canModify: !inherited && email !== serviceAccount && MUTABLE_ROLES.has(permission.role),
      };
    })
    .sort((a, b) => Number(a.inherited) - Number(b.inherited) || a.displayName.localeCompare(b.displayName));
}

export async function listJobFolderPermissionsAction(jobId: string): Promise<Result<{ permissions: JobFolderPermission[] }>> {
  const context = await requireManager(jobId);
  if (!context.ok) return context.result;
  const folder = await context.supabase.from('job_drive_folders').select('google_folder_id').eq('job_id', jobId).is('archived_at', null).maybeSingle();
  if (folder.error) return fail('Folder Job gagal dibaca.');
  if (!folder.data) return { ok: true, message: 'Folder belum dibuat.', data: { permissions: [] } };
  try {
    return { ok: true, message: 'Akses folder berhasil dimuat.', data: { permissions: normalizePermissions(await listDrivePermissions(folder.data.google_folder_id)) } };
  } catch (error) {
    return driveFailure(error, 'Daftar akses Google Drive gagal dimuat.');
  }
}

export async function searchJobAccessUsersAction(input: { jobId: string; query?: string }): Promise<Result<{ users: JobAccessUserOption[] }>> {
  if (!UUID.test(input.jobId)) return fail('Job tidak valid.');
  const search = input.query?.trim().slice(0, 100) ?? '';
  const context = await requireManager(input.jobId);
  if (!context.ok) return context.result;
  const result = await context.supabase.rpc('search_job_access_profiles', {
    p_job_id: input.jobId,
    p_search: search,
    p_limit: 10,
  });
  if (result.error) return fail('Daftar user gagal dimuat.');
  return {
    ok: true,
    message: 'Daftar user berhasil dimuat.',
    data: {
      users: (result.data ?? []).map((profile) => ({
        id: profile.id,
        displayName: profile.display_name,
        email: profile.email,
        avatarUrl: profile.avatar_url,
      })),
    },
  };
}

export async function addJobFolderPermissionAction(input: { jobId: string; email: string; role: PermissionRole }): Promise<Result> {
  const email = input.email.trim().toLowerCase();
  if (!UUID.test(input.jobId) || !EMAIL.test(email) || !MUTABLE_ROLES.has(input.role)) return fail('Email atau role tidak valid.');
  const result = await ensureFolder(input.jobId);
  if (!result.ok) return result.result;
  try {
    await createDrivePermission(result.folder.google_folder_id, email, input.role);
    return { ok: true, message: 'Akses Google Drive berhasil ditambahkan.', data: undefined };
  } catch (error) {
    return driveFailure(error, 'Akses Google Drive gagal ditambahkan.');
  }
}

async function mutablePermission(jobId: string, permissionId: string) {
  const context = await requireManager(jobId);
  if (!context.ok) return context;
  const folder = await context.supabase.from('job_drive_folders').select('google_folder_id').eq('job_id', jobId).is('archived_at', null).maybeSingle();
  if (folder.error || !folder.data) return { ok: false, result: fail('Folder Job tidak ditemukan.') } as const;
  const permission = normalizePermissions(await listDrivePermissions(folder.data.google_folder_id)).find((item) => item.id === permissionId);
  if (!permission?.canModify) return { ok: false, result: fail('Akses turunan dari Shared Drive atau akses sistem tidak dapat diubah di sini.') } as const;
  return { ok: true, folderId: folder.data.google_folder_id } as const;
}

export async function updateJobFolderPermissionAction(input: { jobId: string; permissionId: string; role: PermissionRole }): Promise<Result> {
  if (!UUID.test(input.jobId) || !input.permissionId || !MUTABLE_ROLES.has(input.role)) return fail('Akses tidak valid.');
  try {
    const result = await mutablePermission(input.jobId, input.permissionId);
    if (!result.ok) return result.result;
    await updateDrivePermission(result.folderId, input.permissionId, input.role);
    return { ok: true, message: 'Role akses berhasil diperbarui.', data: undefined };
  } catch (error) {
    return driveFailure(error, 'Role akses gagal diperbarui.');
  }
}

export async function deleteJobFolderPermissionAction(input: { jobId: string; permissionId: string }): Promise<Result> {
  if (!UUID.test(input.jobId) || !input.permissionId) return fail('Akses tidak valid.');
  try {
    const result = await mutablePermission(input.jobId, input.permissionId);
    if (!result.ok) return result.result;
    await deleteDrivePermission(result.folderId, input.permissionId);
    return { ok: true, message: 'Akses langsung berhasil dihapus.', data: undefined };
  } catch (error) {
    return driveFailure(error, 'Akses Google Drive gagal dihapus.');
  }
}
