import 'server-only';

import { getGoogleDriveConfig, getGoogleDriveSopRootFolderId } from './auth';
import { deleteDriveFilePermanently, getDriveFile, GoogleDriveApiError } from './client';

export type DeletionManifest = {
  token: string;
  result?: 'prepared' | 'deactivated';
  folders: { id: string; driveId: string; parentId?: string }[];
  files: { id: string; folderId: string; driveId: string }[];
  storage?: { bucket: string; path: string }[];
};

/** Only database-mapped managed targets, never a root/shared drive or arbitrary URL.
 * Delete registered files first (including trashed files), then the folder and
 * any contents added directly in Drive. 404 is safe on retries; other errors are
 * not success. The durable DB reservation remains until cleanup is complete.
 */
export async function deleteManagedDriveFiles(manifest: DeletionManifest, kind: 'job' | 'sop', deadline = Date.now() + 40_000, onDeleted?: (id: string, isFolder: boolean) => Promise<void>) {
  if (!manifest.folders.length && !manifest.files.length) return;
  const config = getGoogleDriveConfig();
  const root = kind === 'sop' ? getGoogleDriveSopRootFolderId() : config.rootFolderId;
  const protectedIds = new Set([config.sharedDriveId, config.rootFolderId, root, process.env.GOOGLE_DRIVE_SOP_ROOT_FOLDER_ID?.trim()]);
  const folderIds = new Set(manifest.folders.map((folder) => folder.id));
  const targets = [
    ...manifest.files.map((file) => ({ ...file, parent: file.folderId, folder: false })),
    ...[...manifest.folders].sort((a, b) => Number(Boolean(b.parentId)) - Number(Boolean(a.parentId))).map((folder) => ({ ...folder, parent: folder.parentId ?? root, folder: true })),
  ];
  if (
    targets.some(
      (target) =>
        !target.id ||
        protectedIds.has(target.id) ||
        target.driveId !== config.sharedDriveId ||
        (!target.folder && !folderIds.has(target.parent)) ||
        (target.folder && target.parent !== root && !manifest.folders.some((folder) => folder.id === target.parent && !folder.parentId))
    )
  ) {
    throw new Error('Unsafe managed Drive deletion target.');
  }
  // A missing target is retry-safe only while the integration can still read its root.
  const rootFile = await getDriveFile(root);
  if (rootFile.driveId !== config.sharedDriveId || rootFile.mimeType !== 'application/vnd.google-apps.folder') throw new Error('Managed Drive root is invalid.');
  for (const target of targets) {
    if (Date.now() >= deadline) throw new Error('Cleanup needs another retry.');
    try {
      const file = await getDriveFile(target.id);
      if (file.driveId !== config.sharedDriveId || !file.parents?.includes(target.parent) || (target.folder && file.mimeType !== 'application/vnd.google-apps.folder')) {
        throw new Error('Managed file moved outside its expected folder. Cleanup stopped.');
      }
      await deleteDriveFilePermanently(target.id);
    } catch (error) {
      if (!(error instanceof GoogleDriveApiError && error.status === 404)) throw error;
    }
    await onDeleted?.(target.id, target.folder);
  }
}
