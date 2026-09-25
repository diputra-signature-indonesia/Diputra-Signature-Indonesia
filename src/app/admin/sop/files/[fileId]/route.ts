import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { getDriveFileContent } from '@/lib/google-drive/client';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeFilename(value: string) {
  return value.replace(/[\r\n"\\]/g, '_').slice(0, 255) || 'sop-file';
}

export async function GET(_request: Request, context: { params: Promise<{ fileId: string }> }) {
  await requireActiveAdmin();
  const { fileId } = await context.params;
  if (!UUID.test(fileId)) return NextResponse.json({ error: 'File SOP tidak valid.' }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const file = await supabase.from('sop_files')
    .select('storage_provider,google_file_id,original_filename,mime_type')
    .eq('id', fileId)
    .eq('upload_status', 'READY')
    .is('deleted_at', null)
    .maybeSingle();

  if (file.error || !file.data) return NextResponse.json({ error: 'File SOP tidak ditemukan.' }, { status: 404 });

  if (file.data.storage_provider === 'SUPABASE') {
    return NextResponse.json({ error: 'File SOP lama sudah dinonaktifkan setelah perpindahan ke Google Drive.' }, { status: 410 });
  }

  if (!file.data.google_file_id) return NextResponse.json({ error: 'Metadata Google Drive tidak lengkap.' }, { status: 410 });
  try {
    const driveResponse = await getDriveFileContent(file.data.google_file_id);
    const headers = new Headers();
    headers.set('Content-Type', file.data.mime_type || driveResponse.headers.get('content-type') || 'application/octet-stream');
    headers.set('Content-Disposition', `inline; filename="${safeFilename(file.data.original_filename)}"`);
    headers.set('Cache-Control', 'private, no-store');
    const contentLength = driveResponse.headers.get('content-length');
    if (contentLength) headers.set('Content-Length', contentLength);
    return new Response(driveResponse.body, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: 'File Google Drive gagal dibuka.' }, { status: 502 });
  }
}
