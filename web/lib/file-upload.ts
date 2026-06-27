/**
 * File upload service with S3-compatible storage backend.
 *
 * Works with AWS S3, Cloudflare R2, MinIO, and any S3-compatible provider.
 * Validates MIME type, enforces size limits, and sanitizes filenames
 * before upload.
 *
 * Configuration via environment variables:
 * - UPLOAD_BUCKET: S3 bucket name
 * - UPLOAD_REGION: AWS region (default: ap-south-1)
 * - UPLOAD_ACCESS_KEY: IAM access key
 * - UPLOAD_SECRET_KEY: IAM secret key
 * - UPLOAD_ENDPOINT: Custom endpoint for R2/MinIO (optional)
 * - UPLOAD_PUBLIC_URL: Public base URL for uploaded files (optional)
 *
 * @module file-upload
 */

import { randomUUID } from 'crypto';
import { resolveUploadStorageRegion } from '@/lib/storage/readiness';
import { isAppwriteConfigured } from '@/lib/appwrite/config';
import {
  deleteAppwriteFile,
  uploadDocumentToAppwrite,
} from '@/lib/appwrite/storage';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UploadResult {
  /** Whether the upload succeeded */
  isSuccess: boolean;
  /** Public URL of the uploaded file (only on success) */
  url?: string;
  /** Storage key/path within the bucket */
  key?: string;
  /** Error message (only on failure) */
  error?: string;
}

export interface UploadOptions {
  /** Sub-folder within the bucket (e.g., "receipts", "documents") */
  folder: string;
  /** Company ID for tenant isolation in the storage path */
  companyId: string;
  /** Maximum file size in bytes (default: 10MB) */
  maxSizeBytes?: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Default maximum upload size: 10MB */
const DEFAULT_MAX_SIZE_BYTES = 10 * 1024 * 1024;

/** Allowed MIME types mapped to file extensions */
const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'application/zip': '.zip',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'text/html': '.html',
  'text/csv': '.csv',
  'text/plain': '.txt',
};

/** Magic bytes for MIME type verification */
const MAGIC_BYTES: Array<{ bytes: number[]; mime: string }> = [
  { bytes: [0xFF, 0xD8, 0xFF], mime: 'image/jpeg' },
  { bytes: [0x89, 0x50, 0x4E, 0x47], mime: 'image/png' },
  { bytes: [0x47, 0x49, 0x46], mime: 'image/gif' },
  { bytes: [0x52, 0x49, 0x46, 0x46], mime: 'image/webp' },
  { bytes: [0x25, 0x50, 0x44, 0x46], mime: 'application/pdf' },
];

// ─── Configuration ───────────────────────────────────────────────────────────

/**
 * Reads upload configuration from environment variables.
 *
 * @returns Configuration object or null if not configured
 */
function getUploadConfig(): {
  bucket: string;
  region: string;
  accessKey: string;
  secretKey: string;
  endpoint?: string;
  publicUrl?: string;
} | null {
  const bucket = process.env.UPLOAD_BUCKET;
  const accessKey = process.env.UPLOAD_ACCESS_KEY;
  const secretKey = process.env.UPLOAD_SECRET_KEY;

  if (!bucket || !accessKey || !secretKey) {
    return null;
  }

  return {
    bucket,
    region: resolveUploadStorageRegion(),
    accessKey,
    secretKey,
    endpoint: process.env.UPLOAD_ENDPOINT || undefined,
    publicUrl: process.env.UPLOAD_PUBLIC_URL || undefined,
  };
}

function parseAppwriteStorageKey(key: string): string | null {
  const parts = key.split('/');
  if (parts[0] !== 'appwrite' || parts.length < 4 || !parts[3]) return null;
  return parts[3];
}

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Validates a file's MIME type by checking magic bytes.
 * Falls back to declared MIME type if magic bytes don't match any known pattern.
 *
 * @param buffer - File contents as ArrayBuffer
 * @param declaredMime - MIME type declared by the client
 * @returns Validated MIME type or null if not allowed
 */
function validateMimeType(buffer: ArrayBuffer, declaredMime: string): string | null {
  const header = new Uint8Array(buffer.slice(0, 8));

  // Check magic bytes first
  for (const { bytes, mime } of MAGIC_BYTES) {
    const isMatch = bytes.every((byte, index) => header[index] === byte);
    if (isMatch) {
      return ALLOWED_MIME_TYPES[mime] ? mime : null;
    }
  }

  // Fall back to declared MIME for non-binary types (CSV, TXT, DOC)
  if (ALLOWED_MIME_TYPES[declaredMime]) {
    return declaredMime;
  }

  return null;
}

/**
 * Sanitizes a filename by removing path traversal sequences and special characters.
 * Returns a safe filename with the original extension preserved.
 *
 * @param originalName - Original filename from the upload
 * @returns Sanitized filename safe for storage
 */
function sanitizeFilename(originalName: string): string {
  const cleaned = originalName
    .replace(/\.\./g, '')
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 100);

  return cleaned || 'unnamed-file';
}

/**
 * Generates a unique storage key for an uploaded file.
 *
 * Format: `{folder}/{companyId}/{date}/{uuid}-{sanitized-name}`
 * This ensures tenant isolation and prevents filename collisions.
 *
 * @param folder - Upload category folder
 * @param companyId - Tenant company ID
 * @param filename - Sanitized original filename
 * @param extension - File extension from MIME type
 * @returns Unique storage key
 */
function generateStorageKey(
  folder: string,
  companyId: string,
  filename: string,
  extension: string,
): string {
  const date = new Date().toISOString().slice(0, 10);
  const uuid = randomUUID().slice(0, 8);
  const baseName = filename.replace(/\.[^.]+$/, '');
  return `${folder}/${companyId}/${date}/${uuid}-${baseName}${extension}`;
}

// ─── Upload Function ─────────────────────────────────────────────────────────

/**
 * Uploads a file to S3-compatible storage.
 *
 * Validates MIME type via magic bytes, enforces size limits,
 * sanitizes the filename, and uploads with tenant-isolated paths.
 *
 * @param file - File object from form data
 * @param options - Upload configuration (folder, companyId, maxSize)
 * @returns Upload result with URL on success or error on failure
 *
 * @throws Never — all errors are caught and returned in the result
 */
export async function uploadFile(file: File, options: UploadOptions): Promise<UploadResult> {
  const config = getUploadConfig();

  if (!config && !isAppwriteConfigured()) {
    console.error('[FileUpload] Storage not configured — set R2 UPLOAD_* vars or Appwrite APPWRITE_* vars');
    return { isSuccess: false, error: 'File storage is not configured. Contact your administrator.' };
  }

  const maxSize = options.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;

  // Size check
  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024));
    return { isSuccess: false, error: `File size exceeds the ${maxMB}MB limit.` };
  }

  if (file.size === 0) {
    return { isSuccess: false, error: 'Empty files are not allowed.' };
  }

  // MIME type validation
  const buffer = await file.arrayBuffer();
  const validatedMime = validateMimeType(buffer, file.type);

  if (!validatedMime) {
    return { isSuccess: false, error: `File type "${file.type}" is not allowed.` };
  }

  const extension = ALLOWED_MIME_TYPES[validatedMime];
  const sanitizedName = sanitizeFilename(file.name);
  const key = generateStorageKey(options.folder, options.companyId, sanitizedName, extension);

  if (config) {
    try {
      // Use AWS SDK v3-style presigned URL or direct PUT.
      // For now, use the fetch-based S3 PUT approach (works with any S3-compatible API).
      const url = await putObjectToS3(config, key, Buffer.from(buffer), validatedMime);
      return { isSuccess: true, url, key };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      console.error(`[FileUpload] S3 upload failed: key="${key}" error="${message}"`);
      if (!isAppwriteConfigured()) {
        return { isSuccess: false, error: 'Failed to upload file. Please try again.' };
      }
      console.warn('[FileUpload] Falling back to Appwrite storage after S3 upload failure.');
    }
  }

  try {
    const created = await uploadDocumentToAppwrite({
      buffer: Buffer.from(buffer),
      filename: sanitizedName.endsWith(extension) ? sanitizedName : `${sanitizedName}${extension}`,
      mimeType: validatedMime,
      pathPrefix: `${options.folder}/${options.companyId}`,
    });
    const appwriteKey = `appwrite/${options.folder}/${options.companyId}/${created.fileId}`;
    return { isSuccess: true, url: appwriteKey, key: appwriteKey };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    console.error(`[FileUpload] Appwrite upload failed: folder="${options.folder}" company="${options.companyId}" error="${message}"`);
    return { isSuccess: false, error: 'Failed to upload file. Please try again.' };
  }
}

// ─── S3 PUT Implementation ───────────────────────────────────────────────────

/**
 * Uploads a buffer to S3 using the REST API with AWS Signature v4.
 *
 * Uses Node's built-in crypto for signing — no AWS SDK dependency.
 *
 * @param config - S3 configuration
 * @param key - Object key (path in bucket)
 * @param body - File contents
 * @param contentType - MIME type for Content-Type header
 * @returns Public URL of the uploaded object
 */
async function putObjectToS3(
  config: NonNullable<ReturnType<typeof getUploadConfig>>,
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  const { createHmac, createHash } = await import('crypto');

  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, '').slice(0, 8);
  const amzDate = now.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const normalizedEndpoint = config.endpoint?.replace(/\/+$/, '');
  const host = normalizedEndpoint
    ? new URL(normalizedEndpoint).host
    : `${config.bucket}.s3.${config.region}.amazonaws.com`;
  const endpoint = normalizedEndpoint || `https://${host}`;
  const canonicalUri = normalizedEndpoint ? `/${config.bucket}/${key}` : `/${key}`;

  const payloadHash = createHash('sha256').update(body).digest('hex');
  const canonicalQuerystring = '';
  const canonicalHeaders = [
    `content-type:${contentType}`,
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
  ].join('\n') + '\n';
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = [
    'PUT', canonicalUri, canonicalQuerystring, canonicalHeaders, signedHeaders, payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n');

  const signingKey = getSignatureKey(createHmac, config.secretKey, dateStamp, config.region, 's3');
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  const authHeader = `AWS4-HMAC-SHA256 Credential=${config.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(`${endpoint}${canonicalUri}`, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'Host': host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      'Authorization': authHeader,
    },
    body: new Uint8Array(body),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`S3 PUT failed: ${response.status} ${response.statusText} ${errorBody}`);
  }

  // Return public URL
  if (config.publicUrl) {
    return `${config.publicUrl}/${key}`;
  }
  return `${endpoint}${canonicalUri}`;
}

/**
 * Derives the AWS Signature v4 signing key.
 */
function getSignatureKey(
  createHmacFn: typeof import('crypto').createHmac,
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string,
): Buffer {
  const kDate = createHmacFn('sha256', `AWS4${secretKey}`).update(dateStamp).digest();
  const kRegion = createHmacFn('sha256', kDate).update(region).digest();
  const kService = createHmacFn('sha256', kRegion).update(service).digest();
  return createHmacFn('sha256', kService).update('aws4_request').digest();
}

// ─── Delete Function ─────────────────────────────────────────────────────────

/**
 * Deletes a file from S3 storage by its key.
 *
 * @param key - Storage key of the object to delete
 * @returns true if deleted successfully, false otherwise
 */
export async function deleteFile(key: string): Promise<boolean> {
  const appwriteFileId = parseAppwriteStorageKey(key);
  if (appwriteFileId) {
    return deleteAppwriteFile(appwriteFileId);
  }

  const config = getUploadConfig();
  if (!config) return false;

  try {
    const normalizedEndpoint = config.endpoint?.replace(/\/+$/, '');
    const host = normalizedEndpoint
      ? new URL(normalizedEndpoint).host
      : `${config.bucket}.s3.${config.region}.amazonaws.com`;
    const endpoint = normalizedEndpoint || `https://${host}`;
    const objectPath = normalizedEndpoint ? `/${config.bucket}/${key}` : `/${key}`;

    const response = await fetch(`${endpoint}${objectPath}`, { method: 'DELETE' });
    return response.ok || response.status === 204;
  } catch (error) {
    console.error(`[FileUpload] Delete failed: key="${key}"`, error instanceof Error ? error.message : error);
    return false;
  }
}
