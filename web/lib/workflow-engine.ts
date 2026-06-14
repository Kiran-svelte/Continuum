/**
 * Generic Workflow Engine for Continuum HR.
 *
 * Provides a reusable approval pipeline that any module can plug into.
 * Supports: multi-step approval, role-based routing, escalation, delegation.
 *
 * Usage:
 *   - Leave requests, reimbursements, salary revisions, etc. all use the same engine.
 *   - WorkflowTemplate defines the steps; WorkflowInstance tracks a single entity's journey.
 *
 * @module lib/workflow-engine
 */

import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';
import type {
  WorkflowStatus,
  WorkflowActionType,
  WorkflowApproverType,
  Role,
} from '@prisma/client';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Maximum number of steps in a single workflow template. */
const MAX_WORKFLOW_STEPS = 10;

/** Default timeout before auto-escalation (hours). */
const DEFAULT_TIMEOUT_HOURS = 48;

// ─── Types ───────────────────────────────────────────────────────────────────

/** Input for creating a workflow template. */
export interface CreateTemplateInput {
  companyId: string;
  name: string;
  description?: string;
  entityType: string;
  steps: CreateStepInput[];
}

/** Input for a single workflow step definition. */
export interface CreateStepInput {
  name: string;
  approverType: WorkflowApproverType;
  approverRole?: Role;
  approverId?: string;
  isOptional?: boolean;
  timeoutHours?: number;
}

/** Input for starting a workflow instance. */
export interface StartWorkflowInput {
  companyId: string;
  entityType: string;
  entityId: string;
  initiatedBy: string;
}

/** Input for performing an action on a workflow instance. */
export interface WorkflowActionInput {
  instanceId: string;
  actorId: string;
  action: WorkflowActionType;
  comment?: string;
}

/** Result of a workflow action. */
export interface WorkflowActionResult {
  instanceId: string;
  newStatus: WorkflowStatus;
  currentStep: number;
  isComplete: boolean;
  nextApproverType?: WorkflowApproverType;
  nextApproverRole?: Role | null;
}

/** Pending approval item for a user. */
export interface PendingApproval {
  instanceId: string;
  entityType: string;
  entityId: string;
  currentStep: number;
  stepName: string;
  initiatedByName: string;
  createdAt: Date;
}

// ─── Template Management ─────────────────────────────────────────────────────

/**
 * Creates a new workflow template with ordered steps.
 *
 * @param input - Template definition with steps
 * @returns The created template ID
 * @throws Error if step count exceeds MAX_WORKFLOW_STEPS
 */
export async function createWorkflowTemplate(
  input: CreateTemplateInput
): Promise<string> {
  if (input.steps.length > MAX_WORKFLOW_STEPS) {
    throw new Error(`Workflow templates cannot exceed ${MAX_WORKFLOW_STEPS} steps`);
  }

  if (input.steps.length === 0) {
    throw new Error('Workflow template must have at least one step');
  }

  const templateId = randomUUID();

  await prisma.$transaction(async (tx) => {
    await tx.workflowTemplate.create({
      data: {
        id: templateId,
        company_id: input.companyId,
        name: input.name,
        description: input.description,
        entity_type: input.entityType,
      },
    });

    const stepData = input.steps.map((step, index) => ({
      id: randomUUID(),
      template_id: templateId,
      step_order: index + 1,
      name: step.name,
      approver_type: step.approverType,
      approver_role: step.approverRole ?? null,
      approver_id: step.approverId ?? null,
      is_optional: step.isOptional ?? false,
      timeout_hours: step.timeoutHours ?? DEFAULT_TIMEOUT_HOURS,
    }));

    await tx.workflowStep.createMany({ data: stepData });
  });

  return templateId;
}

/**
 * Retrieves the active workflow template for a given entity type and company.
 *
 * @param companyId - The company ID
 * @param entityType - The entity type (e.g. "leave_request")
 * @returns The active template with steps, or null
 */
export async function getActiveTemplate(
  companyId: string,
  entityType: string
) {
  return prisma.workflowTemplate.findFirst({
    where: {
      company_id: companyId,
      entity_type: entityType,
      is_active: true,
    },
    include: {
      steps: { orderBy: { step_order: 'asc' } },
    },
    orderBy: { version: 'desc' },
  });
}

// ─── Instance Lifecycle ──────────────────────────────────────────────────────

/**
 * Starts a new workflow instance for an entity.
 * Finds the active template for the entity type and creates an instance at step 1.
 *
 * @param input - Entity and initiator details
 * @returns The created instance ID, or null if no template exists
 */
export async function startWorkflow(
  input: StartWorkflowInput
): Promise<string | null> {
  const template = await getActiveTemplate(input.companyId, input.entityType);

  if (!template) {
    return null;
  }

  const instanceId = randomUUID();

  await prisma.workflowInstance.create({
    data: {
      id: instanceId,
      template_id: template.id,
      company_id: input.companyId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      initiated_by: input.initiatedBy,
      current_step: 1,
      status: 'pending',
    },
  });

  return instanceId;
}

/**
 * Performs an action on a workflow instance (approve, reject, escalate, etc.).
 *
 * @param input - Action details
 * @returns The result of the action including new status
 * @throws Error if instance not found or action invalid for current state
 */
export async function performAction(
  input: WorkflowActionInput
): Promise<WorkflowActionResult> {
  const instance = await prisma.workflowInstance.findUnique({
    where: { id: input.instanceId },
    include: {
      template: {
        include: { steps: { orderBy: { step_order: 'asc' } } },
      },
    },
  });

  if (!instance) {
    throw new Error('Workflow instance not found');
  }

  if (instance.status === 'approved' || instance.status === 'rejected' || instance.status === 'cancelled') {
    throw new Error(`Cannot perform action on ${instance.status} workflow`);
  }

  const steps = instance.template.steps;
  const totalSteps = steps.length;

  return prisma.$transaction(async (tx) => {
    await tx.workflowAction.create({
      data: {
        id: randomUUID(),
        instance_id: input.instanceId,
        step_order: instance.current_step,
        action: input.action,
        actor_id: input.actorId,
        comment: input.comment,
      },
    });

    const result = resolveNextState(
      input.action,
      instance.current_step,
      totalSteps,
      steps
    );

    await tx.workflowInstance.update({
      where: { id: input.instanceId },
      data: {
        status: result.newStatus,
        current_step: result.currentStep,
        completed_at: result.isComplete ? new Date() : null,
      },
    });

    return {
      instanceId: input.instanceId,
      ...result,
    };
  });
}

// ─── Query Functions ─────────────────────────────────────────────────────────

/**
 * Gets all pending workflow instances where the given user is the expected approver.
 * Checks by role and by specific user assignment.
 *
 * @param userId - The approver's employee ID
 * @param companyId - The company ID
 * @param userRole - The user's primary role
 * @returns Array of pending approval items
 */
export async function getPendingApprovals(
  userId: string,
  companyId: string,
  userRole: Role
): Promise<PendingApproval[]> {
  const pendingInstances = await prisma.workflowInstance.findMany({
    where: {
      company_id: companyId,
      status: { in: ['pending', 'in_progress'] },
    },
    include: {
      template: {
        include: { steps: { orderBy: { step_order: 'asc' } } },
      },
      Employee: { select: { first_name: true, last_name: true } },
    },
    orderBy: { created_at: 'asc' },
  });

  const results: PendingApproval[] = [];

  for (const instance of pendingInstances) {
    const currentStepDef = instance.template.steps.find(
      (s) => s.step_order === instance.current_step
    );

    if (!currentStepDef) {
      continue;
    }

    const isApprover = checkIsApprover(currentStepDef, userId, userRole);

    if (!isApprover) {
      continue;
    }

    results.push({
      instanceId: instance.id,
      entityType: instance.entity_type,
      entityId: instance.entity_id,
      currentStep: instance.current_step,
      stepName: currentStepDef.name,
      initiatedByName: `${instance.Employee.first_name} ${instance.Employee.last_name}`,
      createdAt: instance.created_at,
    });
  }

  return results;
}

/**
 * Gets the full workflow history for a specific entity.
 *
 * @param entityType - The entity type
 * @param entityId - The entity ID
 * @returns Instance with all actions, or null
 */
export async function getWorkflowHistory(
  entityType: string,
  entityId: string
) {
  return prisma.workflowInstance.findFirst({
    where: { entity_type: entityType, entity_id: entityId },
    include: {
      template: { include: { steps: true } },
      actions: {
        include: {
          Employee: { select: { first_name: true, last_name: true, email: true } },
        },
        orderBy: { created_at: 'asc' },
      },
    },
  });
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

interface StepInfo {
  step_order: number;
  approver_type: WorkflowApproverType;
  approver_role: Role | null;
  is_optional: boolean;
}

interface StateResolution {
  newStatus: WorkflowStatus;
  currentStep: number;
  isComplete: boolean;
  nextApproverType?: WorkflowApproverType;
  nextApproverRole?: Role | null;
}

/**
 * Determines the next state of the workflow based on the action taken.
 * Pure function — no side effects.
 */
function resolveNextState(
  action: WorkflowActionType,
  currentStep: number,
  totalSteps: number,
  steps: StepInfo[]
): StateResolution {
  if (action === 'reject') {
    return { newStatus: 'rejected', currentStep, isComplete: true };
  }

  if (action === 'escalate') {
    return { newStatus: 'escalated', currentStep, isComplete: false };
  }

  if (action === 'return_to_sender') {
    return { newStatus: 'pending', currentStep: 1, isComplete: false };
  }

  if (action === 'approve') {
    const nextStep = currentStep + 1;

    if (nextStep > totalSteps) {
      return { newStatus: 'approved', currentStep, isComplete: true };
    }

    const nextStepDef = steps.find((s) => s.step_order === nextStep);

    return {
      newStatus: 'in_progress',
      currentStep: nextStep,
      isComplete: false,
      nextApproverType: nextStepDef?.approver_type,
      nextApproverRole: nextStepDef?.approver_role,
    };
  }

  return { newStatus: 'in_progress', currentStep, isComplete: false };
}

/**
 * Checks if a user is the expected approver for a given workflow step.
 */
function checkIsApprover(
  step: StepInfo & { approver_id?: string | null },
  userId: string,
  userRole: Role
): boolean {
  if (step.approver_type === 'specific_user') {
    return step.approver_id === userId;
  }

  if (step.approver_type === 'role') {
    return step.approver_role === userRole;
  }

  if (step.approver_type === 'reporting_manager') {
    return true;
  }

  if (step.approver_type === 'hr_partner') {
    return userRole === 'hr' || userRole === 'admin';
  }

  return false;
}
