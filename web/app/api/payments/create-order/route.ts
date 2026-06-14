/**
 * Create Razorpay payment order.
 *
 * POST /api/payments/create-order
 * Body: { planId: string }
 *
 * Returns Razorpay order details needed for frontend checkout.
 *
 * @module api/payments/create-order
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, requireCompanyContext, AuthError, requirePermissionGuard} from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createPaymentOrder } from '@/lib/payment-service';
import prisma from '@/lib/prisma';

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
    const { planId } = body;

    if (!planId || typeof planId !== 'string') {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Plan ID is required.', requestId } },
        { status: 400 },
      );
    }

    // Verify plan exists
    const plan = await prisma.pricingPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Pricing plan not found.', requestId } },
        { status: 404 },
      );
    }

    const result = await createPaymentOrder({
      amountInr: plan.price_monthly,
      companyId: employee.org_id,
      planId,
      notes: {
        employee_id: employee.id,
        employee_email: employee.email,
      },
    });

    if (!result.isSuccess) {
      return NextResponse.json(
        { error: { code: 'PAYMENT_ERROR', message: result.error, requestId } },
        { status: 502 },
      );
    }

    return NextResponse.json({
      orderId: result.orderId,
      amount: result.amountPaise,
      currency: 'INR',
      keyId: result.keyId,
      planName: plan.name,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: { code: 'AUTH_ERROR', message: error.message, requestId } },
        { status: error.status },
      );
    }
    console.error('[Payments CreateOrder]', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error', requestId } },
      { status: 500 },
    );
  }
}
