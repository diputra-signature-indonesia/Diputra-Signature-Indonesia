'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createHash } from 'crypto';

type TokenStatus = 'valid' | 'expired' | 'used' | 'invalid';

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function getReviewRequestStatusAction(token: string): Promise<TokenStatus> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('check_review_request_status', {
    p_token: token,
  });

  if (error) throw error;

  const status = String(data ?? 'invalid') as TokenStatus;

  // guard agar hanya menerima value yang kita kenal
  if (!['valid', 'expired', 'used', 'invalid'].includes(status)) return 'invalid';

  return status;
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
