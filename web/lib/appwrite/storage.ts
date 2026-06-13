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

  const created = await storage.createFile(
    appwriteConfig.storageBucketId,
    ID.unique(),
    file
  );

  return {
    fileId: created.$id,
    bucketId: created.bucketId,
    name: created.name,
    mimeType: created.mimeType,
    sizeOriginal: created.sizeOriginal,
  };
}

/** Builds a view/download URL for a stored file (server-side or signed flows). */
export function getAppwriteFileViewUrl(fileId: string): string {
  const { endpoint, projectId, storageBucketId } = appwriteConfig;
  return `${endpoint}/storage/buckets/${storageBucketId}/files/${fileId}/view?project=${projectId}`;
}
