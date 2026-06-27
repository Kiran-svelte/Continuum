/**
 * Tenant-scoped private file upload endpoint backed by R2/S3-compatible storage.
 *
 * POST /api/storage/upload
 * multipart/form-data:
 *   - file: File
 *   - folder: documents | receipts | avatars | attachments | exports
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  AuthError,
  getAuthEmployee,
  requireCompanyContext,
} from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import {
  isStorageFolder,
  uploadTenantFile,
} from '@/lib/storage/r2-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_SIZE_BY_FOLDER: Record<string, number> = {
  documents: 10 * 1024 * 1024,
  receipts: 5 * 1024 * 1024,
  avatars: 2 * 1024 * 1024,
  attachments: 10 * 1024 * 1024,
  exports: 10 * 1024 * 1024,
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? 'unknown';

  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const rateLimit = checkApiRateLimit(employee.id, 'upload');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMITED', message: 'Upload rate limit exceeded.', requestId } },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const folder = formData.get('folder');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: { code: 'MISSING_FILE', message: 'A file is required.', requestId } },
        { status: 400 }
      );
    }

    if (!folder || typeof folder !== 'string' || !isStorageFolder(folder)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_FOLDER',
            message: 'Folder must be one of: documents, receipts, avatars, attachments, exports.',
            requestId,
          },
        },
        { status: 400 }
      );
    }

    const uploaded = await uploadTenantFile(file, {
      folder,
      companyId: employee.org_id,
      maxSizeBytes: MAX_SIZE_BY_FOLDER[folder],
    });

    if (!uploaded.ok) {
      return NextResponse.json(
        { error: { code: 'UPLOAD_FAILED', message: uploaded.error, requestId } },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        key: uploaded.key,
        downloadUrl: uploaded.downloadUrl,
        storage: 'r2',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: { code: 'AUTH_ERROR', message: error.message, requestId } },
        { status: error.status }
      );
    }
    console.error('[Storage Upload]', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error', requestId } },
      { status: 500 }
    );
  }
}
