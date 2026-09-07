export const TURNSTILE_ACTION = 'contact_submit';
export const TURNSTILE_RESPONSE_FIELD = 'cf-turnstile-response';
export const TURNSTILE_MAX_TOKEN_LENGTH = 2048;
export const TURNSTILE_ALWAYS_PASS_TEST_SECRET = '1x0000000000000000000000000000000AA';

export type TurnstileSiteverifyResponse = {
  success?: boolean;
  hostname?: string;
  action?: string;
  'error-codes'?: string[];
};

function normalizeHostname(hostname: string) {
  return hostname.trim().toLowerCase().replace(/\.$/, '');
}

export function parseTurnstileHostnames(value: string | undefined) {
  return new Set((value ?? '').split(',').map(normalizeHostname).filter(Boolean));
}

export function isAcceptedTurnstileResponse(response: TurnstileSiteverifyResponse, allowedHostnames: ReadonlySet<string>) {
  if (!response.success || response.action !== TURNSTILE_ACTION || !response.hostname || allowedHostnames.size === 0) {
    return false;
  }

  return allowedHostnames.has(normalizeHostname(response.hostname));
}

export function isTurnstileTestModeAllowed(options: { enabled: boolean; nodeEnv: string | undefined; vercelEnv: string | undefined; secretKey: string }) {
  const isVercelProduction = options.vercelEnv === 'production';
  const isNonProduction = !isVercelProduction && (options.nodeEnv !== 'production' || options.vercelEnv === 'preview' || options.vercelEnv === 'development');

  return options.enabled && isNonProduction && options.secretKey === TURNSTILE_ALWAYS_PASS_TEST_SECRET;
}
