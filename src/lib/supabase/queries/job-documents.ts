import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function getJobDocuments(jobId: string) {
  const supabase = await createSupabaseServerClient();
  const [folderResult, documentsResult] = await Promise.all([
    supabase
      .from('job_drive_folders')
      .select('id,job_id,google_drive_id,google_folder_id,folder_name,web_view_url,connection_status,last_synced_at')
      .eq('job_id', jobId)
      .is('archived_at', null)
      .maybeSingle(),
    supabase
      .from('job_documents')
      .select('id,job_id,google_file_id,file_name,mime_type,file_size_bytes,web_view_url,sync_status,uploaded_at,uploaded_by')
      .eq('job_id', jobId)
      .is('archived_at', null)
      .order('uploaded_at', { ascending: false })
      .order('id'),
  ]);

  if (folderResult.error) throw new Error(`Unable to load Google Drive folder: ${folderResult.error.message}`);
  if (documentsResult.error) throw new Error(`Unable to load Job documents: ${documentsResult.error.message}`);

  return {
    folder: folderResult.data,
    documents: documentsResult.data ?? [],
  };
}

export type JobDocumentsData = Awaited<ReturnType<typeof getJobDocuments>>;
