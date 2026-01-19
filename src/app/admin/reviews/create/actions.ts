// src/app/admin/reviews/create/actions.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createHash, randomBytes } from 'crypto';

export async function createReviewRequestAction(formData: FormData) {
  const clientName = String(formData.get('clientName') ?? '').trim();
  const clientEmail = String(formData.get('clientEmail') ?? '').trim();

  if (!clientName) {
    throw new Error('Client name is required');
  }

  const supabase = await createSupabaseServerClient();

  // 1) generate token mentah
  const token = randomBytes(32).toString('hex');

  // 2) hash token (sha256 hex)
  const tokenHash = createHash('sha256').update(token).digest('hex');

  // 3) insert ke review_requests
  const { error } = await supabase.from('review_requests').insert({
    token_hash: tokenHash,
    client_name: clientName,
    client_email: clientEmail || null,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 hari
  });

  if (error) {
    throw error;
  }

  // 4) return URL
  return {
    url: `/review-request/${token}`,
  };
}
