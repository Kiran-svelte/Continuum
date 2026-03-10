import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// ─── Validation Schemas ─────────────────────────────────────────────────────

const submitSchema = z.object({
  category: z.enum(['travel', 'medical', 'equipment', 'food', 'other']),
  amount: z.number().positive('Amount must be a positive number'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  receipt_url: z.string().url('Must be a valid URL').optional(),
});

const actionSchema = z.object({
  id: z.string().uuid('Invalid reimbursement ID'),
  action: z.enum(['approve', 'reject', 'process']),
  reason: z.string().max(500).optional(),
});

// ─── GET: List Reimbursements ───────────────────────────────────────────────

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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const statusFilter = searchParams.get('status') || undefined;
    const categoryFilter = searchParams.get('category') || undefined;
    const skip = (page - 1) * limit;

    const isHrOrAdmin =
      employee.primary_role === 'admin' ||
      employee.primary_role === 'hr' ||
      employee.primary_role === 'director' ||
      (employee.secondary_roles &&
        (employee.secondary_roles.includes('admin') ||
          employee.secondary_roles.includes('hr') ||
          employee.secondary_roles.includes('director')));

    // Build the where clause with tenant isolation
    const where: Record<string, unknown> = {
      company_id: employee.org_id,
    };

    // Employees can only see their own; HR/admin see all in company
    if (!isHrOrAdmin) {
      where.emp_id = employee.id;
    }

    if (statusFilter) {
      where.status = statusFilter;
    }

    if (categoryFilter) {
      where.category = categoryFilter;
    }

    const [reimbursements, total] = await Promise.all([
      prisma.reimbursement.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              department: true,
              email: true,
            },
          },
          approver: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.reimbursement.count({ where }),
    ]);

    return NextResponse.json({
      reimbursements,
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
    console.error('[Reimbursements GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST: Submit New Reimbursement ─────────────────────────────────────────

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
    const parsed = submitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { category, amount, description, receipt_url } = parsed.data;

    const reimbursement = await prisma.reimbursement.create({
      data: {
        emp_id: employee.id,
        company_id: employee.org_id,
        category,
        amount,
        description: description || null,
        receipt_url: receipt_url || null,
        status: 'pending',
      },
      include: {
        employee: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            department: true,
          },
        },
      },
    });

    // Create audit log
    const auditAction = 'REIMBURSEMENT_SUBMIT' in AUDIT_ACTIONS
      ? (AUDIT_ACTIONS as Record<string, string>)['REIMBURSEMENT_SUBMIT']
      : 'REIMBURSEMENT_SUBMIT';

    await createAuditLog({
      companyId: employee.org_id,
      actorId: employee.id,
      action: auditAction,
      entityType: 'reimbursement',
      entityId: reimbursement.id,
      newState: {
        category,
        amount,
        description: description || null,
        status: 'pending',
      },
    }).catch((err) => console.error('[Audit log error]', err));

    return NextResponse.json({ reimbursement }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[Reimbursements POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── PATCH: Approve / Reject / Process ──────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requireRole(employee, 'admin', 'hr', 'director');

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();
    const parsed = actionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { id, action, reason } = parsed.data;

    // Fetch the reimbursement with tenant isolation
    const reimbursement = await prisma.reimbursement.findFirst({
      where: {
        id,
        company_id: employee.org_id,
      },
    });

    if (!reimbursement) {
      return NextResponse.json(
        { error: 'Reimbursement not found' },
        { status: 404 }
      );
    }

    // Cannot approve own reimbursement
    if (reimbursement.emp_id === employee.id) {
      return NextResponse.json(
        { error: 'You cannot approve or reject your own reimbursement request' },
        { status: 403 }
      );
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      pending: ['approved', 'rejected'],
      approved: ['processed'],
    };

    const actionToStatus: Record<string, string> = {
      approve: 'approved',
      reject: 'rejected',
      process: 'processed',
    };

    const targetStatus = actionToStatus[action];
    const allowedNextStatuses = validTransitions[reimbursement.status] || [];

    if (!allowedNextStatuses.includes(targetStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status transition: cannot ${action} a reimbursement with status "${reimbursement.status}"`,
        },
        { status: 400 }
      );
    }

    const previousState = {
      status: reimbursement.status,
      approved_by: reimbursement.approved_by,
    };

    const updated = await prisma.reimbursement.update({
      where: { id },
      data: {
        status: targetStatus as 'approved' | 'rejected' | 'processed',
        approved_by: employee.id,
      },
      include: {
        employee: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            department: true,
          },
        },
        approver: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    // Create audit log for the action
    const auditActionKey = `REIMBURSEMENT_${action.toUpperCase()}`;
    const auditAction = auditActionKey in AUDIT_ACTIONS
      ? (AUDIT_ACTIONS as Record<string, string>)[auditActionKey]
      : auditActionKey;

    await createAuditLog({
      companyId: employee.org_id,
      actorId: employee.id,
      action: auditAction,
      entityType: 'reimbursement',
      entityId: id,
      previousState,
      newState: {
        status: targetStatus,
        approved_by: employee.id,
        reason: reason || null,
      },
    }).catch((err) => console.error('[Audit log error]', err));

    return NextResponse.json({ reimbursement: updated });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[Reimbursements PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
