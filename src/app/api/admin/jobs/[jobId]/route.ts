import { getAdminJobPage } from '@/lib/supabase/queries/all-jobs';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Please sign in again.' }, { status: 401, headers });
  const search = new URL(request.url).searchParams;
  const page = Number(search.get('page') ?? '1');
  const query = search.get('query') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(jobId) || !Number.isSafeInteger(page) || page < 1 || page > 1000000 || query.length > 160)
    return NextResponse.json({ message: 'Invalid search.' }, { status: 400, headers });
  try {
    if (search.get('kind') === 'remarks') {
      const { data, error } = await supabase.rpc('search_job_remarks', { p_job_id: jobId, p_page: page }).abortSignal(request.signal);
      if (error) throw error;
      return NextResponse.json(data, { headers });
    }
    const { data: job, error } = await supabase.from('jobs').select('client_id').eq('id', jobId).is('archived_at', null).single();
    if (error) throw error;
    const result = await getAdminJobPage({ status: 'ALL', query }, page, { clientId: job.client_id, excludeJobId: jobId }, request.signal);
    return NextResponse.json(result, { headers });
  } catch {
    return NextResponse.json({ message: 'Unable to load Job data.' }, { status: 500, headers });
  }
}
