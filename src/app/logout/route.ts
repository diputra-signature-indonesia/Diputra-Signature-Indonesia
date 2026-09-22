import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return NextResponse.json({ error: 'Logout gagal. Silakan coba lagi.' }, { status: 502 });
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Logout gagal. Silakan coba lagi.' }, { status: 502 });
  }
}
