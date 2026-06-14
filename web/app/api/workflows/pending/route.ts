/**
 * Workflow API — Get pending approvals for the current user.
 *
 * GET /api/workflows/pending
 *
 * @module api/workflows/pending
 */

import { NextResponse } from 'next/server';
import { getAuthEmployee, requireCompanyContext } from '@/lib/auth-guard';
import { getPendingApprovals } from '@/lib/workflow-engine';
import type { Role } from '@prisma/client';

/**
 * Returns all pending workflow instances awaiting the current user's action.
 *
 * @param request - Incoming request
 * @returns Array of pending approval items
 */
export async function GET(request: Request) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const pendingItems = await getPendingApprovals(
      employee.id,
      employee.org_id,
      employee.primary_role as Role
    );

    return NextResponse.json({ approvals: pendingItems });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = (error as { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: { code: 'WORKFLOW_ERROR', message } },
      { status }
    );
  }
}
