import { deleteFile, uploadFile } from '@/lib/file-upload';

export const STORAGE_FOLDERS = [
  'documents',
  'receipts',
  'avatars',
  'attachments',
  'exports',
] as const;

export type StorageFolder = (typeof STORAGE_FOLDERS)[number];

export function isStorageFolder(value: string): value is StorageFolder {
  return (STORAGE_FOLDERS as readonly string[]).includes(value);
}

export function isStorageKeyForCompany(key: string, companyId: string): boolean {
  const parts = key.split('/');
  return parts.length >= 4 && isStorageFolder(parts[0]) && parts[1] === companyId;
}

export function isPrivateStorageKey(value: string): boolean {
  if (!value || value.includes('..') || value.startsWith('/')) return false;
  if (/^(https?:|data:|blob:|placeholder:)/i.test(value)) return false;
  const parts = value.split('/');
  return parts.length >= 4 && isStorageFolder(parts[0]);
}

export function buildStorageDownloadPath(key: string, inline = false): string {
  const params = new URLSearchParams({ key });
  if (inline) params.set('inline', 'true');
  return `/api/storage/download?${params.toString()}`;
}

export async function uploadTenantFile(
  file: File,
  options: {
    folder: StorageFolder;
    companyId: string;
    maxSizeBytes?: number;
  }
): Promise<
  | {
      ok: true;
      key: string;
      downloadUrl: string;
    }
  | {
      ok: false;
      error: string;
    }
> {
  const result = await uploadFile(file, {
    folder: options.folder,
    companyId: options.companyId,
    maxSizeBytes: options.maxSizeBytes,
  });

  if (!result.isSuccess || !result.key) {
    return { ok: false, error: result.error ?? 'File upload failed' };
  }

  return {
    ok: true,
    key: result.key,
    downloadUrl: buildStorageDownloadPath(result.key, true),
  };
}

export async function deleteTenantFile(key: string, companyId: string): Promise<boolean> {
  if (!isStorageKeyForCompany(key, companyId)) return false;
  return deleteFile(key);
}
