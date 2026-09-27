import 'server-only';

import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type TrashedJob = {
  id: string;
  title: string;
  client: string;
  version: number;
  archivedAt: string;
  deleteAfter: string;
  googleFolderId: string | null;
};

export async function getTrashedJobs(): Promise<TrashedJob[]> {
  const actor = await requireActiveAdmin();
  if (actor.role !== 'admin' && actor.role !== 'super_admin') return [];

  const supabase = await createSupabaseServerClient();
  const { data: jobs, error } = await supabase.from('jobs').select('id,title,client_id,version,archived_at').not('archived_at', 'is', null).order('archived_at', { ascending: false });
  if (error) throw new Error(`Unable to load Job Trash: ${error.message}`);
  if (!jobs?.length) return [];

  const jobIds = jobs.map((job) => job.id);
  const clientIds = Array.from(new Set(jobs.map((job) => job.client_id)));
  const [clients, folders] = await Promise.all([
    supabase.from('clients').select('id,name').in('id', clientIds),
    supabase.from('job_drive_folders').select('job_id,google_folder_id').in('job_id', jobIds),
  ]);
  if (clients.error) throw new Error(`Unable to load trashed Job clients: ${clients.error.message}`);
  if (folders.error) throw new Error(`Unable to load trashed Job folders: ${folders.error.message}`);

  const clientNames = new Map((clients.data ?? []).map((client) => [client.id, client.name]));
  const folderIds = new Map((folders.data ?? []).map((folder) => [folder.job_id, folder.google_folder_id]));

  return jobs.flatMap((job) => {
    if (!job.archived_at) return [];
    return [
      {
        id: job.id,
        title: job.title,
        client: clientNames.get(job.client_id) ?? 'Client tidak tersedia',
        version: job.version,
        archivedAt: job.archived_at,
        deleteAfter: new Date(Date.parse(job.archived_at) + 30 * 86_400_000).toISOString(),
        googleFolderId: folderIds.get(job.id) ?? null,
      },
    ];
  });
}
