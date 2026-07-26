import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, requireCompanyContext, AuthError } from '@/lib/auth-guard';
import { buildContextFromSession } from '@/lib/channel/context-from-session';
import { submitLeaveService } from '@/lib/services/leave-submit';
import { serviceResultToLegacyResponse } from '@/lib/services/service-response';
import { requireModuleForOrg } from '@/lib/core-functions/guard-handler';

export const dynamic = 'force-dynamic';
// Submission runs the constraint engine, approver routing, notifications and
// email in one request — measured at ~25s in production, well past the 10s
// default, which surfaced to users as a hung "Submitting..." button.
export const maxDuration = 60;

/**
 * POST /api/leaves/submit — thin wrapper over submitLeaveService.
 */
export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requireCompanyContext(employee);
    const moduleGuard = await requireModuleForOrg(employee.org_id, 'leave');
    if (moduleGuard) return moduleGuard;

    const body = await request.json();
    const ctx = buildContextFromSession(employee, {
      channel: 'web',
      idempotencyKey: request.headers.get('Idempotency-Key') ?? undefined,
    });

    const result = await submitLeaveService(ctx, body);
    return serviceResultToLegacyResponse(result, 201);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
