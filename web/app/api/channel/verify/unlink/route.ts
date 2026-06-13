import { NextResponse } from 'next/server';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/channel/verify/unlink — revokes active WhatsApp link for employee.
 */
export async function POST(): Promise<NextResponse> {
  try {
    const employee = await getAuthEmployee();

    await prisma.channelIdentityLink.updateMany({
      where: {
        employee_id: employee.id,
        channel: 'whatsapp',
        revoked_at: null,
      },
      data: {
        revoked_at: new Date(),
        revoke_reason: 'user_unlinked',
      },
    });

    return NextResponse.json({ success: true, linked: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: { message: error.message } }, { status: error.status });
    }
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 });
  }
}
