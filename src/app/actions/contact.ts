'use server';

import { sendContactEmail } from '@/lib/email/sendContactEmail';
import { validateContactFormData, type ContactFormValues } from '@/lib/contact/validation';
import { TURNSTILE_RESPONSE_FIELD } from '@/lib/security/turnstile-config';
import { verifyTurnstileToken } from '@/lib/security/turnstile-server';
import { createSupabaseSecretServerClient } from '@/lib/supabase/secret-server';
import { headers } from 'next/headers';

export type ContactState = {
  ok: boolean;
  error?: string;
  values?: ContactFormValues;
};

export async function submitContact(_prevState: ContactState, formData: FormData): Promise<ContactState> {
  const validation = validateContactFormData(formData);
  if (!validation.ok) return validation;

  const tokenValue = formData.get(TURNSTILE_RESPONSE_FIELD);
  const token = typeof tokenValue === 'string' ? tokenValue.trim() : '';
  const requestHeaders = await headers();
  const verification = await verifyTurnstileToken(token, getClientIp(requestHeaders));

  if (!verification.success) {
    if (verification.reason === 'configuration') {
      console.error('Contact verification is not configured.');
      return { ok: false, error: 'Verification is temporarily unavailable. Please try again later.', values: validation.data };
    }

    if (verification.reason === 'siteverify-unavailable') {
      console.error('Contact verification service is unavailable.');
      return { ok: false, error: 'Verification is temporarily unavailable. Please try again.', values: validation.data };
    }

    return { ok: false, error: 'Verification failed. Please try again.', values: validation.data };
  }

  const { name, phone, email, message } = validation.data;

  try {
    const supabase = createSupabaseSecretServerClient();

    const { error: insertError } = await supabase.from('contact_messages').insert([{ name, phone, email, message, status: 'new' }]);
    if (insertError) throw insertError;

    try {
      const emailResult = await sendContactEmail({ name, phone, email, message });
      if ('error' in emailResult && emailResult.error) {
        console.error('Contact email delivery failed after database insert.');
      }
    } catch {
      console.error('Contact email delivery failed after database insert.');
    }

    return { ok: true };
  } catch {
    console.error('Contact database insert failed.');
    return { ok: false, error: 'Failed to send message. Please try again later.', values: { name, phone, email, message } };
  }
}

function getClientIp(requestHeaders: Headers) {
  const forwardedFor = requestHeaders.get('x-forwarded-for');
  const firstForwardedIp = forwardedFor?.split(',')[0]?.trim();

  return firstForwardedIp || requestHeaders.get('x-real-ip')?.trim() || undefined;
}
