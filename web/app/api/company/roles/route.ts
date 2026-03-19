import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getAuthEmployee } from '@/lib/auth-guard';
import prisma from '@/lib/prisma';
import type { Role } from '@prisma/client';

// All possible company roles (excluding super_admin which is platform-level)
const ALL_COMPANY_ROLES: Role[] = [
  'employee',
  'team_lead',
  'manager',
  'director',
  'hr',
  'admin',
];

/**
 * GET /api/company/roles
 * Get the role configuration for the current user's company
 */
export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const employee = await getAuthEmployee(request);
  if (!employee) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (!employee.org_id!) {
    return NextResponse.json({ error: 'No company associated' }, { status: 400 });
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id: employee.org_id! },
      select: {
        id: true,
        name: true,
        enabled_roles: true,
        requires_hr: true,
        requires_manager: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const enabledRoles = (company.enabled_roles as Role[]) || ['employee', 'admin'];

    return NextResponse.json({
      companyId: company.id,
      companyName: company.name,
      enabledRoles,
      requiresHR: company.requires_hr,
      requiresManager: company.requires_manager,
      allAvailableRoles: ALL_COMPANY_ROLES,
    });
  } catch (error) {
    console.error('Error fetching company roles:', error);
    return NextResponse.json({ error: 'Failed to fetch company roles' }, { status: 500 });
  }
}

/**
 * PUT /api/company/roles
 * Update the role configuration for the current user's company
 * Only admins can update role configuration
 */
export async function PUT(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const employee = await getAuthEmployee(request);
  if (!employee) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (employee.primary_role !== 'admin' && employee.primary_role !== 'super_admin') {
    return NextResponse.json({ error: 'Only admins can update role configuration' }, { status: 403 });
  }

  if (!employee.org_id!) {
    return NextResponse.json({ error: 'No company associated' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { enabledRoles, requiresHR, requiresManager } = body;

    // Validate enabled roles
    const validRoles = (enabledRoles as string[]).filter(role => 
      ALL_COMPANY_ROLES.includes(role as Role)
    );

    // Always include employee and admin
    if (!validRoles.includes('employee')) validRoles.push('employee');
    if (!validRoles.includes('admin')) validRoles.push('admin');

    // Update company
    const company = await prisma.company.update({
      where: { id: employee.org_id! },
      data: {
        enabled_roles: validRoles,
        requires_hr: requiresHR ?? (validRoles.includes('hr')),
        requires_manager: requiresManager ?? (validRoles.includes('manager') || validRoles.includes('team_lead') || validRoles.includes('director')),
        updated_at: new Date(),
      },
      select: {
        id: true,
        name: true,
        enabled_roles: true,
        requires_hr: true,
        requires_manager: true,
      },
    });

    return NextResponse.json({
      message: 'Role configuration updated',
      companyId: company.id,
      enabledRoles: company.enabled_roles,
      requiresHR: company.requires_hr,
      requiresManager: company.requires_manager,
    });
  } catch (error) {
    console.error('Error updating company roles:', error);
    return NextResponse.json({ error: 'Failed to update role configuration' }, { status: 500 });
  }
}
