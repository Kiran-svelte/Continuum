import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-service';
import { evaluateOperationsReadiness } from '@/lib/operations-readiness';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ops/operations-readiness
 * Platform super-admin only — 20-category production ops scorecard.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const report = await evaluateOperationsReadiness();
    return NextResponse.json(report, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[GET /api/ops/operations-readiness] Error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
