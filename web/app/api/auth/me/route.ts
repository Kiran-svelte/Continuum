import { NextResponse } from 'next/server';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/me
 *
 * Returns the authenticated employee's basic profile and role.
 * Used by the client to perform role-based dashboard redirect after sign-in.
 */
export async function GET() {
  try {
    const employee = await getAuthEmployee();

    return NextResponse.json({
      id: employee.id,
      email: employee.email,
      first_name: employee.first_name,
      last_name: employee.last_name,
      primary_role: employee.primary_role,
      department: employee.department,
      org_id: employee.org_id,
      status: employee.status,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
