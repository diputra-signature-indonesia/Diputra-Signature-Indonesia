'use server';

import { requireActiveAdmin } from '@/lib/auth/admin-access';
import {
  createDrivePermission,
  createJobFolder,
  createJobDocumentGroupFolder,
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
  type GoogleDrivePermissionRole,
} from '@/lib/google-drive/client';
import { getGoogleDriveConfig, GoogleDriveConfigurationError } from '@/lib/google-drive/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { getJobDocuments, type JobDocumentsData } from '@/lib/supabase/queries/job-documents';
import type { Tables } from '@/types/database.generated';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const MUTABLE_ROLES: ReadonlySet<string> = new Set<GoogleDrivePermissionRole>(['reader', 'commenter', 'writer', 'organizer']);

type Result<T = undefined> = { ok: true; message: string; data: T } | { ok: false; message: string };
type PermissionRole = GoogleDrivePermissionRole;

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
  const job = await supabase.from('jobs').select('id,title,pic_id,deletion_started_at').eq('id', jobId).is('archived_at', null).maybeSingle();
  if (job.error || !job.data) return { ok: false, result: fail('Job tidak ditemukan.') } as const;
  if (job.data.deletion_started_at) return { ok: false, result: fail('Job sedang dihapus permanen. Upload dan perubahan akses dikunci.') } as const;
  const canManage = actor.role === 'admin' || actor.role === 'super_admin' || actor.userId === job.data.pic_id;
  if (!canManage) return { ok: false, result: fail('Hanya PIC Job, admin, atau super admin yang dapat mengelola dokumen.') } as const;
  return { ok: true, actor, supabase, job: job.data } as const;
}

function folderName(title: string, jobId: string) {
  const clean = title
    .replace(/[\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return `${clean || 'Job'} (${jobId.slice(0, 8)})`.slice(0, 240);
}

async function ensureFolder(jobId: string) {
  const context = await requireManager(jobId);
  if (!context.ok) return context;
  const current = await context.supabase
    .from('job_drive_folders')
    .select('id,google_folder_id,google_drive_id,folder_name,web_view_url,connection_status')
    .eq('job_id', jobId)
    .is('archived_at', null)
    .maybeSingle();
  if (current.error) return { ok: false, result: fail('Mapping folder Job gagal dibaca.') } as const;
  if (current.data?.connection_status === 'READY') return { ...context, folder: current.data } as const;

  try {
    const config = getGoogleDriveConfig();
    const driveFolder = (await findJobFolder(jobId)) ?? (await createJobFolder(jobId, folderName(context.job.title, jobId)));
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
  groupId?: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<Result<{ uploadUrl: string; googleFileId: string; folderId: string; maxUploadBytes: number }>> {
  const name = input.fileName.replace(/[\u0000-\u001f]/g, ' ').trim();
  const mimeType = input.mimeType.trim() || 'application/octet-stream';
  if (!UUID.test(input.jobId) || !name || name.length > 500 || !Number.isSafeInteger(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > MAX_UPLOAD_BYTES) {
    return fail('File tidak valid atau melebihi batas 100 MiB.');
  }
  const result = await uploadDestination(input.jobId, input.groupId);
  if (!result.ok) return result.result;
  try {
    const googleFileId = await generateDriveFileId();
    const uploadUrl = await createResumableUpload(result.targetFolderId, googleFileId, name, mimeType, input.sizeBytes);
    return { ok: true, message: 'Sesi upload siap.', data: { uploadUrl, googleFileId, folderId: result.targetFolderId, maxUploadBytes: MAX_UPLOAD_BYTES } };
  } catch (error) {
    return driveFailure(error, 'Sesi upload Google Drive gagal dibuat.');
  }
}

export async function finalizeJobDocumentUploadAction(input: { jobId: string; googleFileId: string; groupId?: string | null }): Promise<Result<{ documentId: string }>> {
  if (!UUID.test(input.jobId) || !input.googleFileId.trim()) return fail('Hasil upload tidak valid.');
  const result = await uploadDestination(input.jobId, input.groupId);
  if (!result.ok) return result.result;
  try {
    const config = getGoogleDriveConfig();
    const file = await getDriveFile(input.googleFileId.trim());
    if (file.trashed || file.driveId !== config.sharedDriveId || !file.parents?.includes(result.targetFolderId) || !file.webViewLink) {
      return fail('File hasil upload tidak berada pada folder Job yang benar.');
    }
    const saved = await result.supabase.rpc('save_grouped_job_document_metadata', {
      p_job_id: input.jobId,
      p_job_drive_folder_id: result.folder.id,
      p_google_file_id: file.id,
      p_google_resource_key: file.resourceKey ?? '',
      p_file_name: file.name,
      p_mime_type: file.mimeType,
      p_file_size_bytes: Number(file.size ?? 0),
      p_web_view_url: file.webViewLink,
      p_group_id: input.groupId ?? undefined,
    });
    if (saved.error) {
      return fail('File sudah masuk Drive, tetapi metadata belum tersimpan. Periksa folder Drive atau coba finalisasi ulang; file tidak dihapus otomatis.');
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

async function uploadDestination(jobId: string, groupId?: string | null) {
  if (groupId && !UUID.test(groupId)) return { ok: false, result: fail('Folder tidak valid.') } as const;
  const result = await ensureFolder(jobId);
  if (!result.ok) return result;
  if (!groupId) return { ...result, targetFolderId: result.folder.google_folder_id } as const;
  const group = await result.supabase
    .from('job_document_groups')
    .select('google_folder_id,status')
    .eq('id', groupId)
    .eq('job_id', jobId)
    .eq('job_drive_folder_id', result.folder.id)
    .is('archived_at', null)
    .maybeSingle();
  if (group.error || !group.data || group.data.status !== 'READY') return { ok: false, result: fail('Folder belum siap atau sedang dihapus. Muat ulang halaman.') } as const;
  try {
    const file = await getDriveFile(group.data.google_folder_id);
    if (file.trashed || file.driveId !== result.folder.google_drive_id || file.mimeType !== 'application/vnd.google-apps.folder' || !file.parents?.includes(result.folder.google_folder_id))
      return { ok: false, result: fail('Folder group tidak berada di folder Job yang benar.') } as const;
    return { ...result, targetFolderId: group.data.google_folder_id } as const;
  } catch (error) {
    return { ok: false, result: driveFailure(error, 'Folder group gagal diverifikasi.') } as const;
  }
}

export async function loadJobDocumentsPageAction(input: { jobId: string; groupId?: string | null; page?: number; groupsPage?: number }): Promise<Result<JobDocumentsData>> {
  await requireActiveAdmin();
  if (
    !UUID.test(input.jobId) ||
    (input.groupId && !UUID.test(input.groupId)) ||
    !Number.isSafeInteger(input.page ?? 1) ||
    (input.page ?? 1) < 1 ||
    !Number.isSafeInteger(input.groupsPage ?? 1) ||
    (input.groupsPage ?? 1) < 1
  )
    return fail('Halaman dokumen tidak valid.');
  try {
    return { ok: true, message: 'Dokumen berhasil dimuat.', data: await getJobDocuments(input.jobId, input.groupId ?? null, input.page ?? 1, input.groupsPage ?? 1) };
  } catch {
    return fail('Daftar dokumen gagal dimuat.');
  }
}

export async function createJobDocumentGroupAction(input: { jobId: string; name: string }): Promise<Result> {
  const name = input.name.replace(/[\u0000-\u001f]/g, ' ').trim();
  if (!UUID.test(input.jobId) || !name || name.length > 120) return fail('Nama folder wajib diisi (maksimal 120 karakter).');
  const context = await ensureFolder(input.jobId);
  if (!context.ok) return context.result;
  try {
    const prepared = await context.supabase.rpc('prepare_job_document_group', { p_job_id: input.jobId, p_name: name, p_google_folder_id: await generateDriveFileId(), p_request_id: randomUUID() });
    if (prepared.error) return fail(prepared.error.code === '23505' ? 'Nama folder tersebut sudah digunakan.' : 'Folder group gagal disiapkan.');
    const group = prepared.data as unknown as Tables<'job_document_groups'>;
    let driveFolder;
    try {
      driveFolder = await getDriveFile(group.google_folder_id);
    } catch (error) {
      if (!(error instanceof GoogleDriveApiError && error.status === 404)) throw error;
      try {
        driveFolder = await createJobDocumentGroupFolder(context.folder.google_folder_id, group.google_folder_id, group.id, group.folder_name);
      } catch (createError) {
        if (!(createError instanceof GoogleDriveApiError && createError.status === 409)) throw createError;
        driveFolder = await getDriveFile(group.google_folder_id);
      }
    }
    if (
      driveFolder.id !== group.google_folder_id ||
      driveFolder.trashed ||
      driveFolder.driveId !== context.folder.google_drive_id ||
      driveFolder.mimeType !== 'application/vnd.google-apps.folder' ||
      !driveFolder.parents?.includes(context.folder.google_folder_id)
    )
      return fail('Folder tidak cocok dengan mapping Job. Pembuatan dihentikan.');
    const completed = await context.supabase.rpc('complete_job_document_group', { p_group_id: group.id });
    if (completed.error) return fail('Folder ada di Drive, tetapi status database belum selesai. Gunakan Retry pada folder tersebut.');
    return { ok: true, message: 'Folder group berhasil dibuat. Akses mengikuti folder Job.', data: undefined };
  } catch (error) {
    return driveFailure(error, 'Pembuatan folder belum selesai. Muat ulang dan gunakan Retry pada folder yang berstatus Pending.');
  } finally {
    refresh(input.jobId);
  }
}

export async function deleteJobDocumentGroupAction(input: { jobId: string; groupId: string; version: number }): Promise<Result> {
  if (!UUID.test(input.jobId) || !UUID.test(input.groupId) || !Number.isSafeInteger(input.version) || input.version < 1) return fail('Folder tidak valid.');
  const context = await requireManager(input.jobId);
  if (!context.ok) return context.result;
  const mapping = await context.supabase.from('job_document_groups').select('id,job_id').eq('id', input.groupId).eq('job_id', input.jobId).maybeSingle();
  if (mapping.error || !mapping.data) return fail('Folder tidak ditemukan di Job ini.');
  try {
    const prepared = await context.supabase.rpc('prepare_job_document_group_trash', { p_group_id: input.groupId, p_expected_version: input.version });
    if (prepared.error) return fail('Folder sudah berubah atau tidak dapat dihapus. Muat ulang halaman.');
    const group = prepared.data as unknown as Tables<'job_document_groups'>;
    const parent = await context.supabase.from('job_drive_folders').select('google_folder_id,google_drive_id').eq('id', group.job_drive_folder_id).eq('job_id', input.jobId).single();
    if (parent.error || !parent.data) return fail('Folder Job gagal diverifikasi.');
    const config = getGoogleDriveConfig();
    if (group.google_folder_id === parent.data.google_folder_id || [config.rootFolderId, config.sharedDriveId, process.env.GOOGLE_DRIVE_SOP_ROOT_FOLDER_ID].includes(group.google_folder_id))
      return fail('Target folder tidak aman.');
    const root = await getDriveFile(parent.data.google_folder_id);
    if (root.trashed || root.driveId !== config.sharedDriveId || root.mimeType !== 'application/vnd.google-apps.folder' || !root.parents?.includes(config.rootFolderId))
      return fail('Folder Job tidak berada pada root yang benar.');
    try {
      const file = await getDriveFile(group.google_folder_id);
      if (file.driveId !== config.sharedDriveId || file.mimeType !== 'application/vnd.google-apps.folder' || !file.parents?.includes(root.id))
        return fail('Folder group telah dipindahkan dari Job. Penghapusan dihentikan.');
      if (!file.trashed) await trashDriveFile(file.id);
    } catch (error) {
      if (!(error instanceof GoogleDriveApiError && error.status === 404)) throw error;
    }
    const finished = await context.supabase.rpc('finish_job_document_group_trash', { p_group_id: input.groupId, p_expected_version: input.version });
    if (finished.error) return fail('Folder sudah di Trash Drive, tetapi database belum selesai. Gunakan Delete lagi untuk melanjutkan.');
    return { ok: true, message: 'Folder beserta isinya dipindahkan ke Trash Drive.', data: undefined };
  } catch (error) {
    return driveFailure(error, 'Penghapusan folder belum selesai. Folder terkunci; gunakan Delete lagi untuk melanjutkan.');
  } finally {
    refresh(input.jobId);
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
