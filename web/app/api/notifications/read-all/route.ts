import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/notifications/read-all
 *
 * Marks all of the authenticated employee's notifications as read.
 */
export async function PATCH() {
  try {
    const employee = await getAuthEmployee();

    await prisma.notification.updateMany({
      where: { emp_id: employee.id, is_read: false },
      data: { is_read: true, read_at: new Date() },
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
