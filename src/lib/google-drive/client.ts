import 'server-only';

import { getGoogleDriveAccessToken, getGoogleDriveConfig, getGoogleDriveSopRootFolderId } from './auth';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

export class GoogleDriveApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export type GoogleDriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
  resourceKey?: string;
  createdTime?: string;
  modifiedTime?: string;
  parents?: string[];
  driveId?: string;
  trashed?: boolean;
};

export type GoogleDrivePermission = {
  id: string;
  type: 'user' | 'group' | 'domain' | 'anyone';
  role: string;
  displayName?: string;
  emailAddress?: string;
  photoLink?: string;
  deleted?: boolean;
  permissionDetails?: Array<{ inherited?: boolean; inheritedFrom?: string; permissionType?: string; role?: string }>;
};

async function driveFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const token = await getGoogleDriveAccessToken();
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init?.headers },
    cache: 'no-store',
  });
  if (!response.ok) {
    const body = await response.text();
    let message = body;
    try {
      message = (JSON.parse(body) as { error?: { message?: string } }).error?.message ?? body;
    } catch {}
    throw new GoogleDriveApiError(message || `Google Drive request failed with status ${response.status}.`, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function escapeDriveQuery(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function googleFolderUrl(folderId: string) {
  return `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`;
}

export async function findJobFolder(jobId: string) {
  const { sharedDriveId, rootFolderId } = getGoogleDriveConfig();
  const query = `'${escapeDriveQuery(rootFolderId)}' in parents and trashed = false and appProperties has { key='dsiJobId' and value='${escapeDriveQuery(jobId)}' }`;
  const params = new URLSearchParams({
    q: query,
    corpora: 'drive',
    driveId: sharedDriveId,
    includeItemsFromAllDrives: 'true',
    supportsAllDrives: 'true',
    pageSize: '2',
    fields: 'files(id,name,mimeType,webViewLink,parents,driveId,trashed)',
  });
  const result = await driveFetch<{ files?: GoogleDriveFile[] }>(`${DRIVE_API}/files?${params}`);
  return result.files?.[0] ?? null;
}

export async function createJobFolder(jobId: string, folderName: string) {
  const { rootFolderId } = getGoogleDriveConfig();
  const params = new URLSearchParams({ supportsAllDrives: 'true', fields: 'id,name,mimeType,webViewLink,parents,driveId,trashed' });
  return driveFetch<GoogleDriveFile>(`${DRIVE_API}/files?${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootFolderId],
      appProperties: { dsiJobId: jobId, managedBy: 'diputra-admin' },
    }),
  });
}

export async function findSopFolder(sopId: string) {
  const { sharedDriveId } = getGoogleDriveConfig();
  const rootFolderId = getGoogleDriveSopRootFolderId();
  const query = `'${escapeDriveQuery(rootFolderId)}' in parents and trashed = false and appProperties has { key='dsiSopId' and value='${escapeDriveQuery(sopId)}' }`;
  const params = new URLSearchParams({
    q: query,
    corpora: 'drive',
    driveId: sharedDriveId,
    includeItemsFromAllDrives: 'true',
    supportsAllDrives: 'true',
    pageSize: '2',
    fields: 'files(id,name,mimeType,webViewLink,parents,driveId,trashed)',
  });
  const result = await driveFetch<{ files?: GoogleDriveFile[] }>(`${DRIVE_API}/files?${params}`);
  return result.files?.[0] ?? null;
}

export async function createSopFolder(sopId: string, folderName: string) {
  const rootFolderId = getGoogleDriveSopRootFolderId();
  const params = new URLSearchParams({ supportsAllDrives: 'true', fields: 'id,name,mimeType,webViewLink,parents,driveId,trashed' });
  return driveFetch<GoogleDriveFile>(`${DRIVE_API}/files?${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootFolderId],
      appProperties: { dsiSopId: sopId, managedBy: 'diputra-admin' },
    }),
  });
}

export async function getDriveFile(fileId: string) {
  const params = new URLSearchParams({
    supportsAllDrives: 'true',
    fields: 'id,name,mimeType,size,webViewLink,resourceKey,createdTime,modifiedTime,parents,driveId,trashed',
  });
  return driveFetch<GoogleDriveFile>(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?${params}`);
}

export async function getDriveFileContent(fileId: string) {
  const token = await getGoogleDriveAccessToken();
  const params = new URLSearchParams({ alt: 'media', supportsAllDrives: 'true' });
  const response = await fetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!response.ok) {
    const message = await response.text();
    throw new GoogleDriveApiError(message || 'Google Drive file content could not be read.', response.status);
  }
  return response;
}

export async function createResumableUpload(folderId: string, fileName: string, mimeType: string, sizeBytes: number, uploadOrigin: string) {
  const token = await getGoogleDriveAccessToken();
  const params = new URLSearchParams({
    uploadType: 'resumable',
    supportsAllDrives: 'true',
    fields: 'id,name,mimeType,size,webViewLink,resourceKey,createdTime,modifiedTime,parents,driveId,trashed',
  });
  const response = await fetch(`${DRIVE_UPLOAD_API}/files?${params}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Length': String(sizeBytes),
      'X-Upload-Content-Type': mimeType,
      Origin: uploadOrigin,
      'X-Origin': uploadOrigin,
    },
    body: JSON.stringify({ name: fileName, parents: [folderId], appProperties: { managedBy: 'diputra-admin' } }),
    cache: 'no-store',
  });
  if (!response.ok) {
    const message = await response.text();
    throw new GoogleDriveApiError(message || 'Google Drive rejected the upload session.', response.status);
  }
  const uploadUrl = response.headers.get('location');
  if (!uploadUrl) throw new Error('Google Drive did not return a resumable upload URL.');
  return uploadUrl;
}

export async function trashDriveFile(fileId: string) {
  const params = new URLSearchParams({ supportsAllDrives: 'true', fields: 'id,trashed' });
  return driveFetch<{ id: string; trashed: boolean }>(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?${params}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trashed: true }),
  });
}

export async function listDrivePermissions(folderId: string) {
  const params = new URLSearchParams({
    supportsAllDrives: 'true',
    pageSize: '100',
    fields: 'permissions(id,type,role,displayName,emailAddress,photoLink,deleted,permissionDetails(inherited,inheritedFrom,permissionType,role))',
  });
  const result = await driveFetch<{ permissions?: GoogleDrivePermission[] }>(`${DRIVE_API}/files/${encodeURIComponent(folderId)}/permissions?${params}`);
  return result.permissions ?? [];
}

export async function createDrivePermission(folderId: string, emailAddress: string, role: 'reader' | 'commenter' | 'writer') {
  const params = new URLSearchParams({ supportsAllDrives: 'true', sendNotificationEmail: 'true', fields: 'id' });
  return driveFetch<{ id: string }>(`${DRIVE_API}/files/${encodeURIComponent(folderId)}/permissions?${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'user', role, emailAddress }),
  });
}

export async function updateDrivePermission(folderId: string, permissionId: string, role: 'reader' | 'commenter' | 'writer') {
  const params = new URLSearchParams({ supportsAllDrives: 'true', fields: 'id,role' });
  return driveFetch<{ id: string; role: string }>(`${DRIVE_API}/files/${encodeURIComponent(folderId)}/permissions/${encodeURIComponent(permissionId)}?${params}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
}

export async function deleteDrivePermission(folderId: string, permissionId: string) {
  const params = new URLSearchParams({ supportsAllDrives: 'true' });
  return driveFetch<void>(`${DRIVE_API}/files/${encodeURIComponent(folderId)}/permissions/${encodeURIComponent(permissionId)}?${params}`, { method: 'DELETE' });
}
