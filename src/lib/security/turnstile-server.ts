import 'server-only';

import {
  isAcceptedTurnstileResponse,
  isTurnstileTestModeAllowed,
  parseTurnstileHostnames,
  TURNSTILE_ACTION,
  TURNSTILE_MAX_TOKEN_LENGTH,
  type TurnstileSiteverifyResponse,
} from '@/lib/security/turnstile-config';

const TURNSTILE_SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export type TurnstileVerificationResult = { success: true } | { success: false; reason: 'configuration' | 'invalid-token' | 'siteverify-unavailable' };

export async function verifyTurnstileToken(token: string, remoteIp?: string): Promise<TurnstileVerificationResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  const allowedHostnames = parseTurnstileHostnames(process.env.TURNSTILE_ALLOWED_HOSTNAMES);

  if (!secretKey || allowedHostnames.size === 0) {
    return { success: false, reason: 'configuration' };
  }

  if (!token || token.length > TURNSTILE_MAX_TOKEN_LENGTH) {
    return { success: false, reason: 'invalid-token' };
  }

  const body = new URLSearchParams({
    secret: secretKey,
    response: token,
    idempotency_key: crypto.randomUUID(),
  });

  if (remoteIp) body.set('remoteip', remoteIp.slice(0, 64));

  try {
    const response = await fetch(TURNSTILE_SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return { success: false, reason: 'siteverify-unavailable' };

    const result = (await response.json()) as TurnstileSiteverifyResponse;
    const testModeAllowed = isTurnstileTestModeAllowed({
      enabled: process.env.TURNSTILE_TEST_MODE === 'true',
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      secretKey,
    });

    if (testModeAllowed && result.success) return { success: true };

    if (!isAcceptedTurnstileResponse(result, allowedHostnames)) {
      return { success: false, reason: 'invalid-token' };
    }

    return { success: true };
  } catch {
    return { success: false, reason: 'siteverify-unavailable' };
  }
}

export { TURNSTILE_ACTION };
