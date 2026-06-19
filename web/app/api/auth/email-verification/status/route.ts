import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-service';
import { getEmailVerificationState } from '@/lib/product-readiness';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/email-verification/status
 *
 * Returns the email verification state for the currently authenticated user.
 *
 * @returns JSON email verification state or error response.
 * @throws Returns 401 if unauthenticated, 404 if employee not found, 500 on internal error.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const employee = await prisma.employee.findUnique({
      where: { id: user.id },
      select: { id: true },
    });
    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    const state = await getEmailVerificationState(employee.id);
    return NextResponse.json(state);
  } catch (error) {
    console.error('[GET /api/auth/email-verification/status] Error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
