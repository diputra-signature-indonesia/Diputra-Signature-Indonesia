import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getMyTaskPage } from '@/lib/supabase/queries/my-tasks';
import { NextResponse } from 'next/server';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Please sign in again.' }, { status: 401, headers });
  const p = new URL(request.url).searchParams;
  const page = Number(p.get('page') ?? '1');
  const taskPage = Number(p.get('taskPage') ?? '1');
  const selected = p.get('selected') || undefined;
  const status = p.get('taskStatus') || undefined;
  const query = p.get('query') ?? '';
  if (
    ![page, taskPage].every((n) => Number.isSafeInteger(n) && n > 0 && n <= 1000000) ||
    query.length > 160 ||
    (p.get('jobQuery') ?? '').length > 160 ||
    [selected, status].some((id) => id && !/^[0-9a-f-]{36}$/i.test(id))
  )
    return NextResponse.json({ message: 'Invalid search.' }, { status: 400, headers });
  try {
    return NextResponse.json(
      await getMyTaskPage(
        {
          query,
          jobQuery: p.get('jobQuery') ?? '',
          deadline: p.get('deadline') ?? 'Any Time',
          internalService: p.get('internalService') ?? '',
          status: p.get('status') ?? 'ACTIVE',
          sortBy: p.get('sortBy') ?? 'Most Urgent',
        },
        page,
        selected,
        taskPage,
        status,
        request.signal
      ),
      { headers }
    );
  } catch {
    return NextResponse.json({ message: 'Unable to load My Tasks.' }, { status: 500, headers });
  }
}
