import { NextResponse } from 'next/server';
import { getAuthEmployee, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const cookieOptions = {
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24,
  httpOnly: true,
};

export async function POST() {
  try {
    const employee = await getAuthEmployee();
    requirePermissionGuard(employee, 'employee.view_own');

    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        tutorial_completed: true,
        updated_at: new Date(),
      },
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set('continuum-employee-welcome-pending', '0', cookieOptions);
    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Failed to complete welcome flow.' }, { status: 500 });
  }
}
