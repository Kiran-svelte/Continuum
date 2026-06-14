/**
 * Workflow API — Start a new workflow instance.
 *
 * POST /api/workflows/start
 * Body: { entityType, entityId }
 *
 * @module api/workflows/start
 */

import { NextResponse } from 'next/server';
import { getAuthEmployee, requireCompanyContext } from '@/lib/auth-guard';
import { requirePermissionGuard } from '@/lib/auth-guard';
import { startWorkflow } from '@/lib/workflow-engine';

/**
 * Starts a new workflow instance for a given entity.
 *
 * @param request - Incoming request with entityType and entityId in body
 * @returns 201 with instanceId, or 404 if no template configured
 */
export async function POST(request: Request) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const body = await request.json();
    const { entityType, entityId } = body as {
      entityType?: string;
      entityId?: string;
    };

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'entityType and entityId are required' } },
        { status: 400 }
      );
    }

    const instanceId = await startWorkflow({
      companyId: employee.org_id,
      entityType,
      entityId,
      initiatedBy: employee.id,
    });

    if (!instanceId) {
      return NextResponse.json(
        { error: { code: 'NO_TEMPLATE', message: `No active workflow template found for entity type: ${entityType}` } },
        { status: 404 }
      );
    }

    return NextResponse.json({ instanceId }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = (error as { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: { code: 'WORKFLOW_ERROR', message } },
      { status }
    );
  }
}
