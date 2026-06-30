/**
 * RALPH-TEST-20260630 — Dev-only demo seed endpoint.
 * Creates test accounts for the E2E test suite.
 * ONLY active when SEED_SECRET env var is set.
 *
 * POST /api/dev/seed-demo
 * Header: x-seed-secret: <SEED_SECRET>
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';

const DEMO_COMPANY_NAME = 'Continuum Demo Corp';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-seed-secret');
  const envSecret = process.env.SEED_SECRET;

  if (!envSecret || secret !== envSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { hashPassword } = await import('@/lib/password-service');

    // Ensure demo company exists
    let company = await prisma.company.findFirst({ where: { name: DEMO_COMPANY_NAME } });
    if (!company) {
      company = await prisma.company.create({
        data: {
          id: randomUUID(),
          name: DEMO_COMPANY_NAME,
          industry: 'Technology',
          size: 'small',
        },
      });
    }

    const created: string[] = [];
    const demoUsers = [
      { email: 'hr@demo.continuum-hr.com', firstName: 'HR', lastName: 'Admin', role: 'hr', password: 'HrAdmin@1234' },
      { email: 'employee@demo.continuum-hr.com', firstName: 'Test', lastName: 'Employee', role: 'employee', password: 'Emp@1234' },
      { email: 'manager@demo.continuum-hr.com', firstName: 'Test', lastName: 'Manager', role: 'manager', password: 'Mgr@1234' },
    ];

    for (const u of demoUsers) {
      const exists = await prisma.employee.findFirst({ where: { email: u.email } });
      if (!exists) {
        const passwordHash = await hashPassword(u.password);
        await prisma.employee.create({
          data: {
            id: randomUUID(),
            email: u.email,
            first_name: u.firstName,
            last_name: u.lastName,
            org_id: company.id,
            primary_role: u.role as 'hr' | 'employee' | 'manager',
            status: 'active',
            password_hash: passwordHash,
            tutorial_completed: true,
            must_change_password: false,
          },
        });
        created.push(u.email);
      }
    }

    // Super admin
    const superAdminEmail = 'superadmin@continuum-hr.com';
    const existsSA = await prisma.superAdmin.findFirst({ where: { email: superAdminEmail } });
    if (!existsSA) {
      const passwordHash = await hashPassword('Admin@1234');
      await prisma.superAdmin.create({
        data: {
          id: randomUUID(),
          email: superAdminEmail,
          name: 'Super Admin',
          password_hash: passwordHash,
          is_active: true,
        },
      });
      created.push(superAdminEmail);
    }

    return NextResponse.json({
      success: true,
      companyId: company.id,
      created,
      message: created.length > 0 ? `Created ${created.length} demo accounts` : 'All demo accounts already exist',
    });
  } catch (error) {
    console.error('[seed-demo] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
