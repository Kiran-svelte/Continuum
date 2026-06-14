/**
 * AI Coaching API
 *
 * GET /api/ai/coaching — Returns personalized coaching insights for the authenticated user
 *
 * @module api/ai/coaching
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, requireCompanyContext, AuthError } from '@/lib/auth-guard';
import { getCoachingInsights } from '@/lib/ai-engine/coaching-engine';
import type { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * Returns personalized coaching insights for the authenticated user.
 * No explicit permission guard — every user can see their own insights.
 *
 * @returns 200 with CoachingResult.
 */
export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const result = await getCoachingInsights(
      employee.id,
      employee.org_id,
      employee.primary_role as Role
    );

    return NextResponse.json({ result });
  } catch (error) {
    return handleApiError(error);
  }
}

function handleApiError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: { code: 'AUTH_ERROR', message: error.message } }, { status: error.status });
  }
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
  return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
}
