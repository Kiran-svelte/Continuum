import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/notifications/[notifId]/read
 *
 * Marks a single notification as read.
 */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ notifId: string }> }
) {
  try {
    const employee = await getAuthEmployee();
    const { notifId } = await params;

    // Verify ownership before updating
    const notification = await prisma.notification.findUnique({
      where: { id: notifId },
      select: { emp_id: true },
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    if (notification.emp_id !== employee.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await prisma.notification.update({
      where: { id: notifId },
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
