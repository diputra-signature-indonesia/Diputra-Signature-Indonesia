import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Tables } from '@/types/database.generated';

export type JobDocument = Pick<
  Tables<'job_documents'>,
  'id' | 'job_id' | 'group_id' | 'google_file_id' | 'file_name' | 'mime_type' | 'file_size_bytes' | 'web_view_url' | 'sync_status' | 'uploaded_at' | 'uploaded_by' | 'version'
>;
export type JobDocumentGroup = Pick<Tables<'job_document_groups'>, 'id' | 'job_id' | 'folder_name' | 'google_folder_id' | 'status' | 'version' | 'created_at'> & { document_count: number };
export type JobDocumentsData = {
  folder: Tables<'job_drive_folders'> | null;
  documents: JobDocument[];
  documentTotal: number;
  documentPage: number;
  groups: JobDocumentGroup[];
  groupTotal: number;
  groupPage: number;
};

export async function getJobDocuments(jobId: string, groupId: string | null = null, page = 1, groupsPage = 1): Promise<JobDocumentsData> {
  const supabase = await createSupabaseServerClient();
  const result = await supabase.rpc('search_job_documents', { p_job_id: jobId, p_group_id: groupId ?? undefined, p_page: page, p_groups_page: groupsPage });
  if (result.error || !result.data) throw new Error('Unable to load Job documents.');
  return result.data as unknown as JobDocumentsData;
}
