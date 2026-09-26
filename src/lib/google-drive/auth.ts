import 'server-only';

import { getVercelOidcToken } from '@vercel/oidc';

const CLOUD_PLATFORM_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';

type CachedAccessToken = { value: string; expiresAt: number };
let cachedAccessToken: CachedAccessToken | null = null;

export class GoogleDriveConfigurationError extends Error {}

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new GoogleDriveConfigurationError(`${name} is not configured.`);
  return value;
}

export function getGoogleDriveConfig() {
  return {
    projectId: required('GCP_PROJECT_ID'),
    projectNumber: required('GCP_PROJECT_NUMBER'),
    serviceAccountEmail: required('GCP_SERVICE_ACCOUNT_EMAIL'),
    poolId: required('GCP_WORKLOAD_IDENTITY_POOL_ID'),
    providerId: required('GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID'),
    sharedDriveId: required('GOOGLE_DRIVE_SHARED_DRIVE_ID'),
    rootFolderId: required('GOOGLE_DRIVE_ROOT_FOLDER_ID'),
    oidcAudience: process.env.GCP_AUDIENCE?.trim() || null,
  };
}

export function getGoogleDriveSopRootFolderId() {
  return required('GOOGLE_DRIVE_SOP_ROOT_FOLDER_ID');
}

function normalizedOrigin(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && url.protocol === 'http:')) {
      throw new Error('Unsupported protocol.');
    }
    return url.origin;
  } catch {
    throw new GoogleDriveConfigurationError('Google Drive upload origin is invalid.');
  }
}

export function getGoogleDriveUploadOrigin(requestOrigin: string | null) {
  const configuredOrigin = normalizedOrigin(required('NEXT_PUBLIC_SITE_URL'));
  const allowedOrigins = new Set([configuredOrigin]);

  for (const hostname of [process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_URL]) {
    if (hostname?.trim()) allowedOrigins.add(normalizedOrigin(`https://${hostname.trim()}`));
  }

  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.add('http://localhost:3000');
    allowedOrigins.add('http://127.0.0.1:3000');
  }

  const origin = requestOrigin ? normalizedOrigin(requestOrigin) : configuredOrigin;
  if (!allowedOrigins.has(origin)) throw new GoogleDriveConfigurationError('Google Drive upload origin is not allowed.');
  return origin;
}

async function readError(response: Response) {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text) as { error?: { message?: string }; error_description?: string };
    return parsed.error?.message ?? parsed.error_description ?? text;
  } catch {
    return text;
  }
}

export async function getGoogleDriveAccessToken() {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) return cachedAccessToken.value;

  const config = getGoogleDriveConfig();
  let oidcToken: string;
  try {
    oidcToken = config.oidcAudience
      ? await getVercelOidcToken({ audience: config.oidcAudience })
      : await getVercelOidcToken();
  } catch {
    throw new GoogleDriveConfigurationError('Vercel OIDC token is unavailable. Google Drive is enabled only in an authorized Vercel environment.');
  }

  const providerAudience = `//iam.googleapis.com/projects/${config.projectNumber}/locations/global/workloadIdentityPools/${config.poolId}/providers/${config.providerId}`;
  const stsResponse = await fetch('https://sts.googleapis.com/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      audience: providerAudience,
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
      scope: CLOUD_PLATFORM_SCOPE,
      subject_token: oidcToken,
      subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    }),
    cache: 'no-store',
  });
  if (!stsResponse.ok) throw new Error(`Google Security Token Service rejected the Vercel identity: ${await readError(stsResponse)}`);
  const federated = await stsResponse.json() as { access_token?: string };
  if (!federated.access_token) throw new Error('Google Security Token Service did not return an access token.');

  const impersonationResponse = await fetch(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(config.serviceAccountEmail)}:generateAccessToken`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${federated.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ scope: [DRIVE_SCOPE], lifetime: '3600s' }),
      cache: 'no-store',
    },
  );
  if (!impersonationResponse.ok) throw new Error(`Service-account impersonation failed: ${await readError(impersonationResponse)}`);
  const impersonated = await impersonationResponse.json() as { accessToken?: string; expireTime?: string };
  if (!impersonated.accessToken) throw new Error('Google IAM Credentials did not return an access token.');

  const expiresAt = impersonated.expireTime ? Date.parse(impersonated.expireTime) : Date.now() + 50 * 60_000;
  cachedAccessToken = { value: impersonated.accessToken, expiresAt };
  return impersonated.accessToken;
}
