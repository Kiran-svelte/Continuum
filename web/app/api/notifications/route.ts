import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications
 *
 * Returns notifications for the authenticated employee.
 *
 * Query params:
 *   limit    - max results (default: 20, max: 50)
 *   unread   - if "true", return only unread notifications
 */
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
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const unreadOnly = searchParams.get('unread') === 'true';

    const where: Record<string, unknown> = { emp_id: employee.id };
    if (unreadOnly) where.is_read = false;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        channel: true,
        is_read: true,
        created_at: true,
      },
    });

    const unreadCount = await prisma.notification.count({
      where: { emp_id: employee.id, is_read: false },
    });

    return NextResponse.json({ notifications, unread_count: unreadCount });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
