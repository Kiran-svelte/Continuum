import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, requireCompanyContext, AuthError } from '@/lib/auth-guard';
import { assertModule } from '@/lib/core-functions/assert-module';
import { executeLeaveList } from './list-shared';

export const dynamic = 'force-dynamic';

/**
 * GET /api/leaves
 *
 * Backward-compatible endpoint for /api/leaves/list.
 * Keeps explicit auth guard signatures at this route boundary.
 */
export async function GET(request: NextRequest) {
	try {
		const employee = await getAuthEmployee(request);
		requireCompanyContext(employee);
		const moduleGuard = await assertModule(employee.org_id!, 'leave');
		if (moduleGuard) return moduleGuard;
		return executeLeaveList(request, employee);
	} catch (error) {
		if (error instanceof AuthError) {
			return NextResponse.json({ error: error.message }, { status: error.status });
		}

		const message =
			process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
