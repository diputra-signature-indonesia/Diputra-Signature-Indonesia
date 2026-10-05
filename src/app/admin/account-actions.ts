'use server';

import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateOwnDisplayNameAction(input: string): Promise<{ ok: true; displayName: string } | { ok: false; message: string }> {
  await requireActiveAdmin();
  if (typeof input !== 'string') return { ok: false, message: 'Display name is invalid.' };
  const name = input.trim();
  if (!name || name.length > 160 || /[\u0000-\u001f\u007f]/.test(name)) {
    return { ok: false, message: 'Enter a display name of 1–160 characters without line breaks.' };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('set_own_display_name', { p_display_name: name });
  if (error) return { ok: false, message: error.code === '42501' ? 'Your account is no longer active.' : 'Unable to save your display name. Please try again.' };
  revalidatePath('/admin', 'layout');
  return { ok: true, displayName: data };
}
