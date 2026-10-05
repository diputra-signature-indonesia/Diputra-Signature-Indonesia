import { deleteDriveFilePermanently, GoogleDriveApiError } from '@/lib/google-drive/client';
import type { Database } from '@/types/database.generated';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 503 });
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!supabaseUrl || !secretKey) return NextResponse.json({ error: 'Supabase server credentials are not configured.' }, { status: 503 });

  const supabase = createClient<Database>(supabaseUrl, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: jobs, error } = await supabase.from('jobs').select('id').not('archived_at', 'is', null).lte('archived_at', cutoff).order('archived_at').limit(25);
  if (error) return NextResponse.json({ error: 'Expired Job Trash could not be loaded.' }, { status: 500 });
  const folders = jobs?.length
    ? await supabase
        .from('job_drive_folders')
        .select('job_id,google_folder_id')
        .in(
          'job_id',
          jobs.map((job) => job.id)
        )
    : { data: [], error: null };
  if (folders.error) return NextResponse.json({ error: 'Drive folder metadata could not be loaded.' }, { status: 500 });
  const folderIds = new Map((folders.data ?? []).map((folder) => [folder.job_id, folder.google_folder_id]));

  const results: Array<{ jobId: string; purged: boolean; error?: string }> = [];
  for (const job of jobs ?? []) {
    const folderId = folderIds.get(job.id);
    try {
      if (folderId) await deleteDriveFilePermanently(folderId);
    } catch (driveError) {
      if (!(driveError instanceof GoogleDriveApiError && driveError.status === 404)) {
        results.push({ jobId: job.id, purged: false, error: 'Google Drive folder could not be deleted.' });
        continue;
      }
    }

    const { error: purgeError } = await supabase.rpc('purge_expired_job', { p_job_id: job.id });
    results.push({ jobId: job.id, purged: !purgeError, ...(purgeError ? { error: 'Database purge failed.' } : {}) });
  }

  return NextResponse.json({ cutoff, processed: results.length, purged: results.filter((result) => result.purged).length, results });
}
