import { deleteManagedDriveFiles, type DeletionManifest } from '@/lib/google-drive/delete-managed-files';
import type { Database } from '@/types/database.generated';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

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
  const deadline = Date.now() + 40_000;
  const results: Array<{ jobId: string; purged: boolean; error?: string }> = [];
  for (const job of jobs ?? []) {
    if (Date.now() >= deadline) break;
    try {
      const prepared = await supabase.rpc('prepare_expired_job_deletion', { p_job_id: job.id });
      if (prepared.error) {
        results.push({ jobId: job.id, purged: false, error: 'Job changed or is not expired Trash.' });
        continue;
      }
      const manifest = prepared.data as unknown as DeletionManifest;
      await deleteManagedDriveFiles(manifest, 'job', deadline, async (id, isFolder) => {
        const ack = await supabase.rpc('ack_deleted_drive_target', { p_kind: 'job', p_id: job.id, p_token: manifest.token, p_google_id: id, p_is_folder: isFolder });
        if (ack.error) throw new Error('External cleanup checkpoint failed.');
      });
      const finished = await supabase.rpc('finish_expired_job_deletion', { p_job_id: job.id, p_token: manifest.token });
      results.push({ jobId: job.id, purged: !finished.error, ...(finished.error ? { error: 'Database finalization needs retry.' } : {}) });
    } catch {
      results.push({ jobId: job.id, purged: false, error: 'External cleanup needs retry. Job remains locked.' });
    }
  }

  return NextResponse.json({ cutoff, processed: results.length, purged: results.filter((result) => result.purged).length, results });
}
