/**
 * Workflow API — Perform action on a workflow instance.
 *
 * PATCH /api/workflows/[id]/action
 * Body: { action: "approve" | "reject" | "escalate" | "return_to_sender", comment? }
 *
 * @module api/workflows/[id]/action
 */

import { NextResponse } from 'next/server';
import { getAuthEmployee, requireCompanyContext } from '@/lib/auth-guard';
import { performAction } from '@/lib/workflow-engine';
import { emitEvent } from '@/lib/event-bus';
import type { WorkflowActionType } from '@prisma/client';

const VALID_ACTIONS: WorkflowActionType[] = [
  'approve', 'reject', 'escalate', 'return_to_sender', 'delegate', 'comment',
];

/**
 * Performs an action (approve, reject, etc.) on a workflow instance.
 *
 * @param request - Incoming request with action and optional comment
 * @param params - Route params containing workflow instance ID
 * @returns Updated workflow status
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: instanceId } = await params;
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const body = await request.json();
    const { action, comment } = body as {
      action?: string;
      comment?: string;
    };

    if (!action || !VALID_ACTIONS.includes(action as WorkflowActionType)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` } },
        { status: 400 }
      );
    }

    const result = await performAction({
      instanceId,
      actorId: employee.id,
      action: action as WorkflowActionType,
      comment,
    });

    await emitEvent({
      companyId: employee.org_id,
      eventType: result.isComplete ? 'workflow.completed' : 'workflow.step_completed',
      entityType: 'workflow_instance',
      entityId: instanceId,
      payload: {
        action,
        actorId: employee.id,
        actorName: `${employee.first_name} ${employee.last_name}`,
        newStatus: result.newStatus,
        currentStep: result.currentStep,
        isComplete: result.isComplete,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = (error as { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: { code: 'WORKFLOW_ERROR', message } },
      { status }
    );
  }
}
