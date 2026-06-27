/**
 * Document uploads to Appwrite Storage bucket.
 */

import { ID } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import { appwriteConfig, isAppwriteConfigured } from '@/lib/appwrite/config';
import { getAppwriteStorage } from '@/lib/appwrite/client';

export interface AppwriteUploadResult {
  fileId: string;
  bucketId: string;
  name: string;
  mimeType: string;
  sizeOriginal: number;
}

export interface AppwriteUploadInput {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  /** Optional path prefix, e.g. orgId/employeeId */
  pathPrefix?: string;
}

export interface AppwriteDownloadResult {
  buffer: Buffer;
  name: string;
  mimeType: string;
  sizeOriginal: number;
}

/**
 * Uploads a file to the configured Appwrite storage bucket.
 * @throws when Appwrite is not configured or upload fails
 */
export async function uploadDocumentToAppwrite(
  input: AppwriteUploadInput
): Promise<AppwriteUploadResult> {
  if (!isAppwriteConfigured()) {
    throw new Error('Appwrite storage is not configured (APPWRITE_API_KEY missing)');
  }

  const storage = getAppwriteStorage();
  const safeName = input.filename.replace(/[^\w.\-]+/g, '_');
  const objectName = input.pathPrefix
    ? `${input.pathPrefix.replace(/\/+$/, '')}/${safeName}`
    : safeName;

  const file = InputFile.fromBuffer(input.buffer, objectName);

  const created = await storage.createFile({
    bucketId: appwriteConfig.storageBucketId,
    fileId: ID.unique(),
    file,
  });

  return {
    fileId: created.$id,
    bucketId: created.bucketId,
    name: created.name,
    mimeType: created.mimeType,
    sizeOriginal: created.sizeOriginal,
  };
}

export async function downloadAppwriteFile(fileId: string): Promise<AppwriteDownloadResult> {
  if (!isAppwriteConfigured()) {
    throw new Error('Appwrite storage is not configured (APPWRITE_API_KEY missing)');
  }

  const storage = getAppwriteStorage();
  const metadata = await storage.getFile({
    bucketId: appwriteConfig.storageBucketId,
    fileId,
  });
  const bytes = await storage.getFileView({
    bucketId: appwriteConfig.storageBucketId,
    fileId,
  });

  return {
    buffer: Buffer.from(bytes),
    name: metadata.name,
    mimeType: metadata.mimeType || 'application/octet-stream',
    sizeOriginal: metadata.sizeOriginal,
  };
}

export async function deleteAppwriteFile(fileId: string): Promise<boolean> {
  if (!isAppwriteConfigured()) return false;

  try {
    await getAppwriteStorage().deleteFile({
      bucketId: appwriteConfig.storageBucketId,
      fileId,
    });
    return true;
  } catch (error) {
    console.error('[AppwriteStorage] Delete failed:', error instanceof Error ? error.message : error);
    return false;
  }
}

/** Builds a view/download URL for a stored file (server-side or signed flows). */
export function getAppwriteFileViewUrl(fileId: string): string {
  const { endpoint, projectId, storageBucketId } = appwriteConfig;
  return `${endpoint}/storage/buckets/${storageBucketId}/files/${fileId}/view?project=${projectId}`;
}
