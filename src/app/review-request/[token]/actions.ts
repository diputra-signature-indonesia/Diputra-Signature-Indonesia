'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ReviewInput, validateReviewInput } from '@/lib/review-validation';

type TokenStatus = 'valid' | 'expired' | 'used' | 'invalid';

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

export type SubmitReviewActionResult = { ok: true; reviewId: string } | { ok: false; message: string };

const REVIEW_RPC_ERROR_MESSAGES: Record<string, string> = {
  review_invalid_token: 'This review link is invalid.',
  review_name_required: 'Name is required.',
  review_name_too_long: 'Name must be 100 characters or fewer.',
  review_email_invalid: 'Enter a valid email address.',
  review_message_required: 'Review message is required.',
  review_message_too_long: 'Review message must be 2,000 characters or fewer.',
  review_request_unavailable: 'This review link is invalid, expired, or has already been used.',
};

function getPublicReviewErrorMessage(databaseMessage: string) {
  return REVIEW_RPC_ERROR_MESSAGES[databaseMessage] ?? 'Failed to submit review. Please try again.';
}

export async function submitReviewAction(input: ReviewInput): Promise<SubmitReviewActionResult> {
  const validation = validateReviewInput(input);
  if (!validation.ok) return validation;

  const supabase = await createSupabaseServerClient();

  const { error, data } = await supabase.rpc('submit_review', {
    p_token: validation.data.token,
    p_name: validation.data.name,
    p_email: validation.data.email,
    p_message: validation.data.message,
  });

  if (error) {
    console.error('submit_review RPC failed', {
      code: error.code,
      message: error.message,
    });

    return {
      ok: false,
      message: getPublicReviewErrorMessage(error.message),
    };
  }

  return { ok: true, reviewId: data as string };
}
