import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getQuestionAnswerManagementData } from '@/lib/supabase/queries/question-answer-management';
import { NextResponse } from 'next/server';

const headers = { 'Cache-Control': 'private, no-store' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Please sign in again.' }, { status: 401, headers });
  const { data: profile } = await supabase.from('profiles').select('is_active,deleted_at').eq('id', user.id).maybeSingle();
  if (!profile?.is_active || profile.deleted_at) return NextResponse.json({ message: 'Admin access required.' }, { status: 403, headers });
  const category = new URL(request.url).searchParams.get('category') ?? '';
  if (!UUID.test(category)) return NextResponse.json({ message: 'Invalid Service.' }, { status: 400, headers });
  try {
    return NextResponse.json(await getQuestionAnswerManagementData(category, request.signal), { headers });
  } catch {
    return NextResponse.json({ message: 'Unable to load Q&A.' }, { status: 500, headers });
  }
}
