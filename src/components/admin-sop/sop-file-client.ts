'use client';

import {
  finalizeSopFileUploadAction,
  prepareSopFileUploadAction,
} from '@/app/admin/sop/actions';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function normalizedMimeType(file: File) {
  if (file.type) return file.type;
  if (/\.pdf$/i.test(file.name)) return 'application/pdf';
  if (/\.jpe?g$/i.test(file.name)) return 'image/jpeg';
  if (/\.png$/i.test(file.name)) return 'image/png';
  if (/\.webp$/i.test(file.name)) return 'image/webp';
  return '';
}

export async function uploadSopFile(input: {
  serviceId: string;
  description: string | null;
  fileType: 'FLOW' | 'REQUIREMENT';
  file: File;
  sortOrder: number;
}) {
  if (input.file.size <= 0 || input.file.size > MAX_FILE_SIZE) return { ok: false as const, message: 'Ukuran file wajib lebih dari 0 dan maksimal 10 MiB.' };
  const mimeType = normalizedMimeType(input.file);
  const title = input.file.name.replace(/\.[^.]+$/, '').trim() || input.file.name;
  const reservation = await prepareSopFileUploadAction({
    serviceId: input.serviceId,
    description: input.description,
    fileType: input.fileType,
    title,
    originalFilename: input.file.name,
    mimeType,
    sizeBytes: input.file.size,
    sortOrder: input.sortOrder,
  });
  if (!reservation.ok) return reservation;

  let googleFileId = '';
  try {
    const uploaded = await fetch(reservation.data.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': mimeType },
      body: input.file,
    });
    if (!uploaded.ok) return { ok: false as const, message: `Google Drive menolak upload file (${uploaded.status}).` };
    const metadata = await uploaded.json() as { id?: string };
    googleFileId = metadata.id?.trim() ?? '';
  } catch {
    return { ok: false as const, message: 'Upload ke Google Drive terputus. Silakan coba kembali.' };
  }
  if (!googleFileId) return { ok: false as const, message: 'Google Drive tidak mengembalikan identitas file hasil upload.' };

  const finalized = await finalizeSopFileUploadAction({
    sopId: reservation.data.sopId,
    folderId: reservation.data.folderId,
    fileType: input.fileType,
    title,
    originalFilename: input.file.name,
    mimeType,
    sizeBytes: input.file.size,
    sortOrder: input.sortOrder,
    googleFileId,
  });
  if (!finalized.ok) return finalized;
  return { ok: true as const, message: finalized.message };
}
