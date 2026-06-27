/**
 * File upload API route.
 *
 * Accepts multipart/form-data with a single file, validates auth and tenant
 * context, then uploads to S3-compatible storage via the file-upload service.
 *
 * POST /api/upload
 * Body: multipart/form-data with fields:
 *   - file: The file to upload
 *   - folder: Storage category (e.g., "receipts", "documents", "avatars")
 *
 * Response: { url: string, key: string } on success
 *           { error: { code, message, details, requestId } } on failure
 *
 * @module api/upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, requireCompanyContext, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog } from '@/lib/audit';
import { uploadTenantFile, type StorageFolder } from '@/lib/storage/r2-client';

export const dynamic = 'force-dynamic';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Valid folder names that can be used for uploads */
const VALID_FOLDERS = new Set([
  'receipts',
  'documents',
  'avatars',
  'attachments',
  'exports',
]);

/** Maximum file size per folder (in bytes) */
const FOLDER_SIZE_LIMITS: Record<string, number> = {
  receipts: 5 * 1024 * 1024,     // 5MB
  documents: 10 * 1024 * 1024,    // 10MB
  avatars: 2 * 1024 * 1024,       // 2MB
  attachments: 10 * 1024 * 1024,   // 10MB
  exports: 10 * 1024 * 1024,       // 10MB
};

// ─── POST Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? 'unknown';

  try {
    const employee = await getAuthEmployee();
    requireCompanyContext(employee);

    const rateLimit = checkApiRateLimit(employee.id, 'upload');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMITED', message: 'Upload rate limit exceeded.', requestId } },
        { status: 429, headers: getRateLimitHeaders(rateLimit) },
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const folder = formData.get('folder');

    // Validate inputs
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: { code: 'MISSING_FILE', message: 'A file is required.', requestId } },
        { status: 400 },
      );
    }

    if (!folder || typeof folder !== 'string' || !VALID_FOLDERS.has(folder)) {
      return NextResponse.json(
        { error: { code: 'INVALID_FOLDER', message: `Folder must be one of: ${[...VALID_FOLDERS].join(', ')}`, requestId } },
        { status: 400 },
      );
    }

    const storageFolder = folder as StorageFolder;
    const maxSize = FOLDER_SIZE_LIMITS[storageFolder];

    const uploaded = await uploadTenantFile(file, {
      folder: storageFolder,
      companyId: employee.org_id,
      maxSizeBytes: maxSize,
    });

    if (!uploaded.ok) {
      return NextResponse.json(
        { error: { code: 'UPLOAD_FAILED', message: uploaded.error, requestId } },
        { status: 422 },
      );
    }

    // Audit log for file uploads
    void createAuditLog({
      companyId: employee.org_id,
      actorId: employee.id,
      action: 'FILE_UPLOAD',
      entityType: 'File',
      entityId: uploaded.key,
      newState: {
        folder,
        originalName: file.name,
        size: file.size,
        key: uploaded.key,
        storage: uploaded.storage,
      },
    }).catch((err) => console.error('[FileUpload Audit]', err instanceof Error ? err.message : err));

    return NextResponse.json({
      url: uploaded.downloadUrl,
      key: uploaded.key,
      storageKey: uploaded.key,
      storage: uploaded.storage,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: { code: 'AUTH_ERROR', message: error.message, requestId } },
        { status: error.status },
      );
    }
    console.error('[Upload POST]', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error', requestId } },
      { status: 500 },
    );
  }
}
