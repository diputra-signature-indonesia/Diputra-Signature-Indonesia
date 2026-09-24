'use client';

import {
  failSopFileUploadAction,
  finalizeSopFileUploadAction,
  prepareSopFileUploadAction,
} from '@/app/admin/sop/actions';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

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

  const supabase = createSupabaseBrowserClient();
  const uploaded = await supabase.storage.from(reservation.data.bucketId).upload(reservation.data.storagePath, input.file, {
    cacheControl: '3600',
    contentType: mimeType,
    upsert: false,
  });
  if (uploaded.error) {
    await failSopFileUploadAction({ fileId: reservation.data.fileId, expectedVersion: reservation.data.version });
    return { ok: false as const, message: `Upload file gagal: ${uploaded.error.message}` };
  }

  const finalized = await finalizeSopFileUploadAction({ fileId: reservation.data.fileId, expectedVersion: reservation.data.version });
  if (!finalized.ok) return finalized;
  return { ok: true as const, message: finalized.message };
}
