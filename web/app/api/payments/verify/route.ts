/**
 * Verify Razorpay payment after checkout.
 *
 * POST /api/payments/verify
 * Body: { orderId: string, paymentId: string, signature: string }
 *
 * Verifies the Razorpay signature and activates the subscription.
 *
 * @module api/payments/verify
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, requireCompanyContext, AuthError, requirePermissionGuard} from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { verifyPayment } from '@/lib/payment-service';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? 'unknown';

  try {
    const employee = await getAuthEmployee();
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'company.manage_billing');

    const rateLimit = checkApiRateLimit(employee.id, 'payment');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMITED', message: 'Rate limit exceeded.', requestId } },
        { status: 429, headers: getRateLimitHeaders(rateLimit) },
      );
    }

    const body = await request.json();
    const { orderId, paymentId, signature } = body;

    // Validate required fields
    const errors: string[] = [];
    if (!orderId || typeof orderId !== 'string') errors.push('orderId is required.');
    if (!paymentId || typeof paymentId !== 'string') errors.push('paymentId is required.');
    if (!signature || typeof signature !== 'string') errors.push('signature is required.');

    if (errors.length > 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: errors.join(' '), requestId } },
        { status: 400 },
      );
    }

    const result = await verifyPayment({
      orderId,
      paymentId,
      signature,
      companyId: employee.org_id,
    });

    if (!result.isSuccess) {
      return NextResponse.json(
        { error: { code: 'PAYMENT_VERIFICATION_FAILED', message: result.error, requestId } },
        { status: 422 },
      );
    }

    // Audit log for payment
    void createAuditLog({
      companyId: employee.org_id,
      actorId: employee.id,
      action: 'PAYMENT_COMPLETED',
      entityType: 'Payment',
      entityId: result.paymentRecordId ?? orderId,
      newState: { orderId, paymentId, status: 'completed' },
    }).catch((err) => console.error('[Payment Audit]', err instanceof Error ? err.message : err));

    return NextResponse.json({
      isSuccess: true,
      message: 'Payment verified and subscription activated.',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: { code: 'AUTH_ERROR', message: error.message, requestId } },
        { status: error.status },
      );
    }
    console.error('[Payments Verify]', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error', requestId } },
      { status: 500 },
    );
  }
}
