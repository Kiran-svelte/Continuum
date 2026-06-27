/**
 * LMS File Upload API
 *
 * POST /api/upload/course-content — Upload course content files (PDF, video, etc.)
 * POST /api/upload/expense-receipt — Upload expense receipt images
 *
 * Files are stored in private tenant-scoped R2/S3-compatible storage.
 * A signed app download URL is returned for browser access.
 *
 * Limits:
 * - Course content: 100MB max
 * - Receipts: 5MB max
 * - MIME type validated via file extension + content
 *
 * @module api/upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, requireCompanyContext, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import path from 'path';
import { uploadTenantFile, type StorageFolder } from '@/lib/storage/r2-client';

export const dynamic = 'force-dynamic';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Max file sizes in bytes. */
const MAX_SIZES = {
  'course-content': 100 * 1024 * 1024, // 100MB
  'expense-receipt': 5 * 1024 * 1024,  // 5MB
} as const;

/** Allowed MIME types per category. */
const ALLOWED_TYPES = {
  'course-content': [
    'application/pdf',
    'video/mp4',
    'video/webm',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'text/html',
  ],
  'expense-receipt': [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ],
} as const;

/** Extension → MIME type map for validation. */
const EXT_TO_MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.zip': 'application/zip',
  '.html': 'text/html',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

type UploadCategory = keyof typeof MAX_SIZES;

const STORAGE_FOLDER_BY_CATEGORY: Record<UploadCategory, StorageFolder> = {
  'course-content': 'attachments',
  'expense-receipt': 'receipts',
};

// ─── POST /api/upload/[category] ──────────────────────────────────────────────

/**
 * Uploads a file and returns a URL path.
 * Route: /api/upload/[category] where category is 'course-content' | 'expense-receipt'.
 *
 * @returns 201 with { url } pointing to the saved file.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    const { category: categoryParam } = await params;
    const category = categoryParam as UploadCategory;
    if (!Object.keys(MAX_SIZES).includes(category)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: `Invalid upload category: ${category}. Must be course-content or expense-receipt` } },
        { status: 400 }
      );
    }

    if (category === 'course-content') {
      requirePermissionGuard(employee, 'lms.manage_courses');
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'file field is required in form data' } },
        { status: 400 }
      );
    }

    const fileSizeError = validateFileSize(file, category);
    if (fileSizeError) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: fileSizeError } }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    const mimeError = validateFileMime(file.type, ext, category);
    if (mimeError) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: mimeError } }, { status: 400 });
    }

    const uploaded = await uploadTenantFile(file, {
      folder: STORAGE_FOLDER_BY_CATEGORY[category],
      companyId: employee.org_id,
      maxSizeBytes: MAX_SIZES[category],
    });

    if (!uploaded.ok) {
      return NextResponse.json(
        { error: { code: 'UPLOAD_FAILED', message: uploaded.error } },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        url: uploaded.downloadUrl,
        key: uploaded.key,
        storageKey: uploaded.key,
        category,
        storage: uploaded.storage,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Validates file size against category limit.
 */
function validateFileSize(file: File, category: UploadCategory): string | null {
  const maxSize = MAX_SIZES[category];
  if (file.size > maxSize) {
    const maxMb = Math.round(maxSize / (1024 * 1024));
    return `File too large. Max size for ${category} is ${maxMb}MB`;
  }
  return null;
}

/**
 * Validates MIME type via both content-type header and file extension.
 */
function validateFileMime(mimeType: string, ext: string, category: UploadCategory): string | null {
  const allowed = ALLOWED_TYPES[category] as readonly string[];

  const isMimeAllowed = allowed.includes(mimeType);
  const expectedMime = EXT_TO_MIME[ext];
  const isExtAllowed = expectedMime !== undefined && allowed.includes(expectedMime);

  if (!isMimeAllowed || !isExtAllowed) {
    return `File type not allowed for ${category}. Allowed: ${allowed.join(', ')}`;
  }

  return null;
}

function handleApiError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: { code: 'AUTH_ERROR', message: error.message } }, { status: error.status });
  }
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
  return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
}
