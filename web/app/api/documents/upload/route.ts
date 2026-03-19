import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extracts the file extension from a filename and normalises to lowercase.
 */
function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

/**
 * Converts an ArrayBuffer to a base64-encoded data URL.
 */
function toBase64DataUrl(buffer: ArrayBuffer, mimeType: string): string {
  const base64 = Buffer.from(buffer).toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Attempts to upload to Supabase Storage.
 * Returns the public URL on success or null if unavailable / failed.
 */
async function trySupabaseUpload(
  fileBuffer: ArrayBuffer,
  mimeType: string,
  orgId: string,
  employeeId: string,
  filename: string
): Promise<string | null> {
  // Only attempt if Supabase URL is configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  try {
    // Dynamic import so the module is optional
    const { createClient } = await import('@supabase/supabase-js');

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const uniqueName = `${randomUUID()}-${filename}`;
    const storagePath = `${orgId}/${employeeId}/${uniqueName}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, Buffer.from(fileBuffer), {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error('[documents/upload] Supabase upload error:', uploadError.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('documents')
      .getPublicUrl(storagePath);

    return publicUrlData?.publicUrl ?? null;
  } catch (err) {
    console.error('[documents/upload] Supabase storage unavailable:', err);
    return null;
  }
}

// ─── POST Handler ─────────────────────────────────────────────────────────────

/**
 * POST /api/documents/upload
 *
 * Accepts multipart/form-data with fields:
 *   file     - the file blob (required)
 *   name     - document name (required)
 *   category - one of: personal_id, certificate, offer_letter, payslip, tax_form, other (required)
 *
 * Upload strategy:
 *   1. If Supabase Storage is configured, upload there and use the public URL.
 *   2. Otherwise fall back to storing the file as a base64 data URL.
 *   3. If the base64 payload exceeds the database column limit, store a
 *      placeholder URL with a note.
 */
export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();

    // ── Rate limiting ───────────────────────────────────────────────────
    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    // ── Parse multipart form data ───────────────────────────────────────
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

    // ── Validation ──────────────────────────────────────────────────────
    const errors: string[] = [];

    if (!file || !(file instanceof File)) {
      errors.push('A file is required.');
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      errors.push('Document name is required.');
    } else if (typeof name === 'string' && name.trim().length > 255) {
      errors.push('Document name must be 255 characters or fewer.');
    }

    if (
      !category ||
      typeof category !== 'string' ||
      !VALID_CATEGORIES.includes(category as DocumentCategory)
    ) {
      errors.push(
        `Category must be one of: ${VALID_CATEGORIES.join(', ')}.`
      );
    }

    // Early exit if basic fields are missing
    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(' ') }, { status: 400 });
    }

    // At this point we know file is a File
    const uploadedFile = file as File;
    const docName = (name as string).trim();
    const docCategory = category as string;

    // ── File size validation ────────────────────────────────────────────
    if (uploadedFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size exceeds the maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
        },
        { status: 400 }
      );
    }

    if (uploadedFile.size === 0) {
      return NextResponse.json(
        { error: 'Uploaded file is empty.' },
        { status: 400 }
      );
    }

    // ── File type validation ────────────────────────────────────────────
    const mimeType = uploadedFile.type;
    const extension = getFileExtension(uploadedFile.name);

    const mimeAllowed = Object.keys(ALLOWED_MIME_TYPES).includes(mimeType);
    const extAllowed = ALLOWED_EXTENSIONS.includes(extension);

    if (!mimeAllowed && !extAllowed) {
      return NextResponse.json(
        {
          error: `File type not allowed. Accepted types: PDF, PNG, JPG, JPEG, DOC, DOCX.`,
        },
        { status: 400 }
      );
    }

    // ── Read file buffer ────────────────────────────────────────────────
    const fileBuffer = await uploadedFile.arrayBuffer();

    // ── Upload strategy ─────────────────────────────────────────────────
    let documentUrl: string;
    let storageMethod: 'supabase' | 'base64' | 'placeholder';

    // 1. Try Supabase Storage
    const supabaseUrl = await trySupabaseUpload(
      fileBuffer,
      mimeType,
      employee.org_id!,
      employee.id,
      uploadedFile.name
    );

    if (supabaseUrl) {
      documentUrl = supabaseUrl;
      storageMethod = 'supabase';
    } else {
      // 2. Fall back to base64 data URL
      const dataUrl = toBase64DataUrl(fileBuffer, mimeType);

      // Guard against extremely large payloads that may not fit in the DB column
      if (dataUrl.length <= 5 * 1024 * 1024) {
        documentUrl = dataUrl;
        storageMethod = 'base64';
      } else {
        // 3. Placeholder when neither strategy is viable
        documentUrl = `placeholder://upload-pending/${randomUUID()}/${uploadedFile.name}`;
        storageMethod = 'placeholder';
      }
    }

    // ── Create the Document record ──────────────────────────────────────
    const document = await prisma.document.create({
      data: {
        emp_id: employee.id,
        company_id: employee.org_id!,
        name: docName,
        type: docCategory,
        url: documentUrl,
        status: 'pending',
      },
    });

    // ── Audit log ───────────────────────────────────────────────────────
    await createAuditLog({
      companyId: employee.org_id!,
      actorId: employee.id,
      action: 'DOCUMENT_UPLOAD',
      entityType: 'Document',
      entityId: document.id,
      newState: {
        name: docName,
        type: docCategory,
        status: 'pending',
        storageMethod,
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
          url: storageMethod === 'base64' ? '[base64 stored]' : document.url,
          status: document.status,
          storageMethod,
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
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
