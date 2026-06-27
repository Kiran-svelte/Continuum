import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  AuthError,
  getAuthEmployee,
  requireCompanyContext,
} from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog } from '@/lib/audit';
import { assertModule } from '@/lib/core-functions/assert-module';
import { uploadTenantFile } from '@/lib/storage/r2-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

const ALLOWED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx'];

const VALID_CATEGORIES = [
  'personal_id',
  'certificate',
  'offer_letter',
  'payslip',
  'tax_form',
  'other',
] as const;

type DocumentCategory = (typeof VALID_CATEGORIES)[number];

function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

/**
 * POST /api/documents/upload
 *
 * Accepts multipart/form-data with fields:
 *   file     - the file blob (required)
 *   name     - document name (required)
 *   category - one of: personal_id, certificate, offer_letter, payslip, tax_form, other (required)
 *
 * Storage is R2/S3-only through uploadTenantFile. If storage is unavailable,
 * the request fails visibly instead of storing base64, public URLs, or placeholders.
 */
export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const moduleGuard = await assertModule(employee.org_id, 'documents');
    if (moduleGuard) return moduleGuard;

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: 'Invalid form data. Expected multipart/form-data.' },
        { status: 400 }
      );
    }

    const file = formData.get('file');
    const name = formData.get('name');
    const category = formData.get('category');
    const errors: string[] = [];

    if (!file || !(file instanceof File)) {
      errors.push('A file is required.');
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      errors.push('Document name is required.');
    } else if (name.trim().length > 255) {
      errors.push('Document name must be 255 characters or fewer.');
    }

    if (
      !category ||
      typeof category !== 'string' ||
      !VALID_CATEGORIES.includes(category as DocumentCategory)
    ) {
      errors.push(`Category must be one of: ${VALID_CATEGORIES.join(', ')}.`);
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(' ') }, { status: 400 });
    }

    const uploadedFile = file as File;
    const docName = (name as string).trim();
    const docCategory = category as DocumentCategory;

    if (uploadedFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds the maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB.` },
        { status: 400 }
      );
    }

    if (uploadedFile.size === 0) {
      return NextResponse.json(
        { error: 'Uploaded file is empty.' },
        { status: 400 }
      );
    }

    const mimeType = uploadedFile.type;
    const extension = getFileExtension(uploadedFile.name);
    const mimeAllowed = Object.keys(ALLOWED_MIME_TYPES).includes(mimeType);
    const extAllowed = ALLOWED_EXTENSIONS.includes(extension);

    if (!mimeAllowed && !extAllowed) {
      return NextResponse.json(
        { error: 'File type not allowed. Accepted types: PDF, PNG, JPG, JPEG, DOC, DOCX.' },
        { status: 400 }
      );
    }

    const uploaded = await uploadTenantFile(uploadedFile, {
      folder: 'documents',
      companyId: employee.org_id,
      maxSizeBytes: MAX_FILE_SIZE,
    });

    if (!uploaded.ok) {
      return NextResponse.json(
        { error: uploaded.error },
        { status: 422 }
      );
    }

    const document = await prisma.document.create({
      data: {
        emp_id: employee.id,
        company_id: employee.org_id,
        name: docName,
        type: docCategory,
        url: uploaded.key,
        status: 'pending',
      },
    });

    await createAuditLog({
      companyId: employee.org_id,
      actorId: employee.id,
      action: 'DOCUMENT_UPLOAD',
      entityType: 'Document',
      entityId: document.id,
      newState: {
        name: docName,
        type: docCategory,
        status: 'pending',
        storageMethod: 'r2',
        storageKey: uploaded.key,
        fileName: uploadedFile.name,
        fileSize: uploadedFile.size,
        mimeType,
      },
    });

    return NextResponse.json(
      {
        message: 'Document uploaded successfully.',
        document: {
          id: document.id,
          name: docName,
          type: document.type,
          url: uploaded.downloadUrl,
          storageKey: uploaded.key,
          status: document.status,
          storageMethod: 'r2',
          fileName: uploadedFile.name,
          fileSize: uploadedFile.size,
          created_at: document.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[documents/upload]', error);
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
