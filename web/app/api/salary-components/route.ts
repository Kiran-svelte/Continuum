import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// ─── GET: List all salary components for the company, grouped by type ────────

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

    const components = await prisma.salaryComponent.findMany({
      where: { company_id: employee.org_id },
      orderBy: { created_at: 'desc' },
    });

    // Group by type
    const grouped: Record<string, typeof components> = {};
    for (const comp of components) {
      if (!grouped[comp.type]) {
        grouped[comp.type] = [];
      }
      grouped[comp.type].push(comp);
    }

    return NextResponse.json({
      components,
      grouped,
      total: components.length,
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

// ─── POST: Create a new salary component (HR/admin only) ────────────────────

export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requireRole(employee, 'hr', 'admin');

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();
    const { name, type, is_taxable } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const validTypes = ['earning', 'deduction', 'statutory'];
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Check for duplicate name within company
    const existing = await prisma.salaryComponent.findFirst({
      where: {
        company_id: employee.org_id,
        name: name.trim(),
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A salary component with this name already exists' },
        { status: 409 }
      );
    }

    const component = await prisma.salaryComponent.create({
      data: {
        company_id: employee.org_id,
        name: name.trim(),
        type,
        is_taxable: typeof is_taxable === 'boolean' ? is_taxable : true,
        is_active: true,
      },
    });

    await createAuditLog({
      companyId: employee.org_id,
      actorId: employee.id,
      action: AUDIT_ACTIONS.COMPANY_SETTINGS_UPDATE,
      entityType: 'SalaryComponent',
      entityId: component.id,
      previousState: null,
      newState: { name: component.name, type: component.type, is_taxable: component.is_taxable },
    });

    return NextResponse.json(component, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── PATCH: Update a salary component ───────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requireRole(employee, 'hr', 'admin');

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();
    const { id, name, type, is_taxable, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = await prisma.salaryComponent.findUnique({ where: { id } });
    if (!existing || existing.company_id !== employee.org_id) {
      return NextResponse.json({ error: 'Salary component not found' }, { status: 404 });
    }

    const validTypes = ['earning', 'deduction', 'statutory'];
    if (type !== undefined && !validTypes.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // If renaming, check for duplicate name
    if (name && name.trim() !== existing.name) {
      const duplicate = await prisma.salaryComponent.findFirst({
        where: {
          company_id: employee.org_id,
          name: name.trim(),
          id: { not: id },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: 'A salary component with this name already exists' },
          { status: 409 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (type !== undefined) updateData.type = type;
    if (typeof is_taxable === 'boolean') updateData.is_taxable = is_taxable;
    if (typeof is_active === 'boolean') updateData.is_active = is_active;

    const updated = await prisma.salaryComponent.update({
      where: { id },
      data: updateData,
    });

    await createAuditLog({
      companyId: employee.org_id,
      actorId: employee.id,
      action: AUDIT_ACTIONS.COMPANY_SETTINGS_UPDATE,
      entityType: 'SalaryComponent',
      entityId: updated.id,
      previousState: { name: existing.name, type: existing.type, is_taxable: existing.is_taxable, is_active: existing.is_active },
      newState: { name: updated.name, type: updated.type, is_taxable: updated.is_taxable, is_active: updated.is_active },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── DELETE: Delete a salary component (HR/admin only) ──────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requireRole(employee, 'hr', 'admin');

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = await prisma.salaryComponent.findUnique({ where: { id } });
    if (!existing || existing.company_id !== employee.org_id) {
      return NextResponse.json({ error: 'Salary component not found' }, { status: 404 });
    }

    await prisma.salaryComponent.delete({ where: { id } });

    await createAuditLog({
      companyId: employee.org_id,
      actorId: employee.id,
      action: AUDIT_ACTIONS.COMPANY_SETTINGS_UPDATE,
      entityType: 'SalaryComponent',
      entityId: existing.id,
      previousState: { name: existing.name, type: existing.type, is_taxable: existing.is_taxable },
      newState: null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
