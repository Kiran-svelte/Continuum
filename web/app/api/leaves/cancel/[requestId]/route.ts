import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { buildContextFromSession } from '@/lib/channel/context-from-session';
import { cancelLeaveService } from '@/lib/services/leave-cancel';
import { serviceResultToLegacyResponse } from '@/lib/services/service-response';

export const dynamic = 'force-dynamic';

/**
 * POST /api/leaves/cancel/[requestId] — thin wrapper over cancelLeaveService.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const employee = await getAuthEmployee();
    const { requestId } = await params;
    const body = await request.json().catch(() => ({}));

    const ctx = buildContextFromSession(employee, {
      channel: 'web',
      idempotencyKey: request.headers.get('Idempotency-Key') ?? undefined,
    });

    const result = await cancelLeaveService(ctx, {
      requestId,
      reason: typeof body.reason === 'string' ? body.reason : undefined,
    });

    if (result.ok) {
      return NextResponse.json({ id: result.data.requestId, status: result.data.status });
    }

    return serviceResultToLegacyResponse(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
