'use server';

import { getJobActivityPage, type JobActivityPage } from '@/lib/supabase/queries/job-activity';

export type LoadJobActivityResult = { ok: true; page: JobActivityPage } | { ok: false; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function loadMoreJobActivityAction(input: { jobId: string; before: string }): Promise<LoadJobActivityResult> {
  if (!UUID.test(input.jobId) || !input.before || Number.isNaN(Date.parse(input.before))) {
    return { ok: false, message: 'Cursor riwayat aktivitas tidak valid.' };
  }
  try {
    return { ok: true, page: await getJobActivityPage(input.jobId, input.before) };
  } catch {
    return { ok: false, message: 'Riwayat aktivitas berikutnya gagal dimuat. Silakan coba kembali.' };
  }
}
