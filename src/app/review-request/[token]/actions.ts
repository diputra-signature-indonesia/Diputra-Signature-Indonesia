'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createHash } from 'crypto';

type TokenStatus = 'valid' | 'expired' | 'used' | 'invalid';

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function getReviewRequestStatusAction(token: string): Promise<TokenStatus> {
  const supabase = await createSupabaseServerClient();
  const tokenHash = hashToken(token);

  const { data, error } = await supabase.from('review_requests').select('used_at, revoked_at, expires_at').eq('token_hash', tokenHash).maybeSingle();

  if (error) throw error;
  if (!data) return 'invalid';
  if (data.revoked_at) return 'invalid';
  if (data.used_at) return 'used';
  if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) return 'expired';
  return 'valid';
}

export async function submitReviewAction(input: { token: string; name: string; email: string; message: string }) {
  const supabase = await createSupabaseServerClient();

  const { error, data } = await supabase.rpc('submit_review', {
    p_token: input.token,
    p_name: input.name,
    p_email: input.email,
    p_message: input.message,
  });

  if (error) throw error;

  return { reviewId: data as string };
}
