import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog } from '@/lib/audit';
import { sendNotification } from '@/lib/notification-service';

export const dynamic = 'force-dynamic';

// Valid document categories
const VALID_CATEGORIES = [
  'personal_id',
  'certificate',
  'offer_letter',
  'payslip',
  'tax_form',
  'other',
] as const;

type DocumentCategory = (typeof VALID_CATEGORIES)[number];

// Valid document statuses for filtering
const VALID_STATUSES = ['pending', 'verified', 'rejected', 'expired'] as const;

/**
 * GET /api/documents
 *
 * Returns a paginated list of documents.
 * - Regular employees see only their own documents.
 * - HR / admin / director roles see all company documents.
 *
 * Query params:
 *   page      - page number (default: 1)
 *   limit     - results per page (default: 50, max: 100)
 *   category  - filter by document category
 *   status    - filter by DocumentStatus
 */
export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
    const category = searchParams.get('category') ?? undefined;
    const status = searchParams.get('status') ?? undefined;

    // Build query filter
    const where: Record<string, unknown> = {
      company_id: employee.org_id,
      deleted_at: null,
    };

    // HR, admin, and director can see all company documents; others see only their own
    const hrRoles = ['admin', 'hr', 'director'];
    if (!hrRoles.includes(employee.primary_role)) {
      where.emp_id = employee.id;
    }

    if (category && VALID_CATEGORIES.includes(category as DocumentCategory)) {
      where.type = category;
    }

    if (status && (VALID_STATUSES as readonly string[]).includes(status)) {
      where.status = status;
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        select: {
          id: true,
          name: true,
          type: true,
          url: true,
          status: true,
          verified_by: true,
          verified_at: true,
          created_at: true,
          emp_id: true,
          employee: {
            select: {
              first_name: true,
              last_name: true,
              email: true,
            },
          },
          verifier: {
            select: {
              first_name: true,
              last_name: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.document.count({ where }),
    ]);

    return NextResponse.json({
      documents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/documents
 *
 * Creates a new document record for the authenticated employee.
 *
 * Body:
 *   name         - document name (required)
 *   category     - one of: personal_id, certificate, offer_letter, payslip, tax_form, other (required)
 *   url          - document URL (required)
 *   description  - optional text description (stored in name suffix for now)
 *   expiryDate   - optional ISO date string
 */
export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();
    const { name, category, url, description, expiryDate } = body;

    // ── Validation ──────────────────────────────────────────────────────
    const errors: string[] = [];

    if (!name || typeof name !== 'string' || !name.trim()) {
      errors.push('Document name is required.');
    } else if (name.trim().length > 255) {
      errors.push('Document name must be 255 characters or fewer.');
    }

    if (!category || !VALID_CATEGORIES.includes(category as DocumentCategory)) {
      errors.push(
        `Category must be one of: ${VALID_CATEGORIES.join(', ')}.`
      );
    }

    if (!url || typeof url !== 'string' || !url.trim()) {
      errors.push('Document URL is required.');
    } else if (url.trim().length > 2048) {
      errors.push('Document URL must be 2048 characters or fewer.');
    }

    if (description && typeof description === 'string' && description.trim().length > 1000) {
      errors.push('Description must be 1000 characters or fewer.');
    }

    if (expiryDate) {
      const parsed = new Date(expiryDate);
      if (isNaN(parsed.getTime())) {
        errors.push('Expiry date is not a valid date.');
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(' ') }, { status: 400 });
    }

    // ── Build the document name with description metadata ───────────────
    // The Document model does not have separate description/expiry fields,
    // so we encode them as a JSON metadata suffix on the `name` field.
    // The `type` field stores the category.
    const docName = name.trim();
    const metadata: Record<string, string> = {};
    if (description && description.trim()) {
      metadata.description = description.trim();
    }
    if (expiryDate) {
      metadata.expiryDate = new Date(expiryDate).toISOString();
    }

    // Store name as "docName|||JSON" when metadata exists, otherwise plain name
    const storedName =
      Object.keys(metadata).length > 0
        ? `${docName}|||${JSON.stringify(metadata)}`
        : docName;

    // ── Create the document ─────────────────────────────────────────────
    const document = await prisma.document.create({
      data: {
        emp_id: employee.id,
        company_id: employee.org_id,
        name: storedName,
        type: category,
        url: url.trim(),
        status: 'pending',
      },
    });

    // ── Audit log ───────────────────────────────────────────────────────
    await createAuditLog({
      companyId: employee.org_id,
      actorId: employee.id,
      action: 'DOCUMENT_UPLOAD',
      entityType: 'Document',
      entityId: document.id,
      newState: {
        name: docName,
        type: category,
        url: url.trim(),
        status: 'pending',
        ...(description ? { description: description.trim() } : {}),
        ...(expiryDate ? { expiryDate } : {}),
      },
    });

    return NextResponse.json(
      {
        message: 'Document uploaded successfully.',
        document: {
          id: document.id,
          name: docName,
          type: document.type,
          url: document.url,
          status: document.status,
          description: metadata.description ?? null,
          expiryDate: metadata.expiryDate ?? null,
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

/**
 * PUT /api/documents
 *
 * HR / Admin can verify or reject a document.
 *
 * Body:
 *   id      - document UUID (required)
 *   action  - 'verify' | 'reject' (required)
 */
export async function PUT(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requireRole(employee, 'admin', 'hr');

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();
    const { id, action } = body;

    // ── Validation ──────────────────────────────────────────────────────
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Document id is required.' },
        { status: 400 }
      );
    }

    if (!action || !['verify', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: "Action must be 'verify' or 'reject'." },
        { status: 400 }
      );
    }

    // ── Find the document and ensure tenant isolation ────────────────────
    const existing = await prisma.document.findFirst({
      where: {
        id,
        company_id: employee.org_id,
        deleted_at: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Document not found.' },
        { status: 404 }
      );
    }

    // ── Update the document ─────────────────────────────────────────────
    const newStatus = action === 'verify' ? 'verified' : 'rejected';

    const updated = await prisma.document.update({
      where: { id },
      data: {
        status: newStatus,
        verified_by: employee.id,
        verified_at: new Date(),
      },
      select: {
        id: true,
        name: true,
        type: true,
        url: true,
        status: true,
        verified_by: true,
        verified_at: true,
        created_at: true,
        emp_id: true,
        employee: {
          select: {
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        verifier: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    // ── Audit log ───────────────────────────────────────────────────────
    await createAuditLog({
      companyId: employee.org_id,
      actorId: employee.id,
      action: action === 'verify' ? 'DOCUMENT_VERIFY' : 'DOCUMENT_REJECT',
      entityType: 'Document',
      entityId: id,
      previousState: { status: existing.status },
      newState: {
        status: newStatus,
        verified_by: employee.id,
        verified_at: updated.verified_at,
      },
    });

    // Notify the document owner about the verification/rejection
    if (existing.emp_id !== employee.id) {
      const docName = existing.name.split('|||')[0];
      void sendNotification(
        existing.emp_id,
        employee.org_id,
        'document',
        `Document ${action === 'verify' ? 'Verified' : 'Rejected'}`,
        `Your document "${docName}" has been ${newStatus} by ${employee.first_name} ${employee.last_name}.`
      ).catch(() => {});
    }

    return NextResponse.json({
      message: `Document ${newStatus} successfully.`,
      document: updated,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/documents
 *
 * Updates document metadata (name, category, expiry date).
 * - Employees can only edit their own documents.
 * - HR / Admin can edit any document in their company.
 *
 * Body:
 *   id         - document UUID (required)
 *   name       - new document name (optional)
 *   category   - new category (optional)
 *   expiryDate - new expiry date or null to clear (optional)
 */
export async function PATCH(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();
    const { id, name, category, expiryDate } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Document id is required.' },
        { status: 400 }
      );
    }

    // Validation
    const errors: string[] = [];
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        errors.push('Document name cannot be empty.');
      } else if (name.trim().length > 255) {
        errors.push('Document name must be 255 characters or fewer.');
      }
    }
    if (category !== undefined && !VALID_CATEGORIES.includes(category as DocumentCategory)) {
      errors.push(`Category must be one of: ${VALID_CATEGORIES.join(', ')}.`);
    }
    if (expiryDate !== undefined && expiryDate !== null) {
      const parsed = new Date(expiryDate);
      if (isNaN(parsed.getTime())) {
        errors.push('Expiry date is not a valid date.');
      }
    }
    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(' ') }, { status: 400 });
    }

    // Find document with tenant isolation
    const existing = await prisma.document.findFirst({
      where: {
        id,
        company_id: employee.org_id,
        deleted_at: null,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }

    // Authorization
    const isPrivileged = ['admin', 'hr'].includes(employee.primary_role);
    if (!isPrivileged && existing.emp_id !== employee.id) {
      return NextResponse.json(
        { error: 'You can only edit your own documents.' },
        { status: 403 }
      );
    }

    // Parse existing metadata
    const parts = existing.name.split('|||');
    const currentDisplayName = parts[0];
    let currentMeta: Record<string, string> = {};
    if (parts[1]) {
      try { currentMeta = JSON.parse(parts[1]); } catch { /* ignore */ }
    }

    // Build updated values
    const newDisplayName = name !== undefined ? name.trim() : currentDisplayName;
    const newCategory = category !== undefined ? category : existing.type;

    if (expiryDate !== undefined) {
      if (expiryDate === null) {
        delete currentMeta.expiryDate;
      } else {
        currentMeta.expiryDate = new Date(expiryDate).toISOString();
      }
    }

    const storedName =
      Object.keys(currentMeta).length > 0
        ? `${newDisplayName}|||${JSON.stringify(currentMeta)}`
        : newDisplayName;

    const updated = await prisma.document.update({
      where: { id },
      data: {
        name: storedName,
        type: newCategory,
      },
      select: {
        id: true,
        name: true,
        type: true,
        url: true,
        status: true,
        created_at: true,
      },
    });

    await createAuditLog({
      companyId: employee.org_id,
      actorId: employee.id,
      action: 'DOCUMENT_UPDATE',
      entityType: 'Document',
      entityId: id,
      previousState: { name: existing.name, type: existing.type },
      newState: { name: storedName, type: newCategory },
    });

    return NextResponse.json({
      message: 'Document updated successfully.',
      document: {
        id: updated.id,
        name: newDisplayName,
        type: updated.type,
        url: updated.url,
        status: updated.status,
        expiryDate: currentMeta.expiryDate ?? null,
        created_at: updated.created_at,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/documents
 *
 * Soft-deletes a document.
 * - HR / Admin can delete any document in their company.
 * - Regular employees can only delete their own documents.
 *
 * Body:
 *   id - document UUID (required)
 */
export async function DELETE(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Document id is required.' },
        { status: 400 }
      );
    }

    // ── Find the document with tenant isolation ─────────────────────────
    const existing = await prisma.document.findFirst({
      where: {
        id,
        company_id: employee.org_id,
        deleted_at: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Document not found.' },
        { status: 404 }
      );
    }

    // ── Authorization: HR/admin can delete any, employees only their own ─
    const isPrivileged = ['admin', 'hr'].includes(employee.primary_role);
    if (!isPrivileged && existing.emp_id !== employee.id) {
      return NextResponse.json(
        { error: 'You can only delete your own documents.' },
        { status: 403 }
      );
    }

    // ── Soft delete ─────────────────────────────────────────────────────
    await prisma.document.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    // ── Audit log ───────────────────────────────────────────────────────
    await createAuditLog({
      companyId: employee.org_id,
      actorId: employee.id,
      action: 'DOCUMENT_DELETE',
      entityType: 'Document',
      entityId: id,
      previousState: {
        name: existing.name,
        type: existing.type,
        status: existing.status,
        emp_id: existing.emp_id,
      },
      newState: { deleted_at: new Date().toISOString() },
    });

    return NextResponse.json({
      message: 'Document deleted successfully.',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
