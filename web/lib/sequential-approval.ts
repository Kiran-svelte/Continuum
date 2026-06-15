/**
 * Sequential Approval Engine for Leave Requests.
 *
 * Enforces L1 → L2 → L3 → L4 → HR Partner order when a company
 * has a full_hierarchy role model and an ApprovalHierarchy row
 * exists for the requesting employee.
 *
 * For companies using hr_employee or hr_manager_employee models
 * (no multi-level chain configured), this degrades gracefully to
 * single-step approval.
 *
 * @module lib/sequential-approval
 */
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// ─── Types ───────────────────────────────────────────────────────────────────

/** A single entry in the approval trail JSON array. */
interface ApprovalTrailEntry {
  level: number;
  approverId: string;
  approverName: string;
  action: 'approve' | 'reject';
  timestamp: string;
  comments: string | null;
}

/** Result of checking whether an approver can act on a request. */
interface SequentialCheckResult {
  isAllowed: boolean;
  reason: string;
  /** The level this approver occupies in the chain (1-5, where 5 = HR Partner). */
  approverLevel: number | null;
  /** Whether this approval would be the final one (fully approved). */
  isFinalApproval: boolean;
  /** Next approver ID after this one, if any. */
  nextApproverId: string | null;
}

/** Ordered chain of approvers for an employee. */
interface ApprovalChainLink {
  level: number;
  approverId: string;
  label: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** HR Partner is treated as level 5 in the sequence. */
const HR_PARTNER_LEVEL = 5;

interface SequentialTrailMeta {
  approval_level?: number;
  approval_trail?: ApprovalTrailEntry[];
}

function readSequentialMeta(constraintResult: unknown): SequentialTrailMeta {
  if (!constraintResult || typeof constraintResult !== 'object' || Array.isArray(constraintResult)) {
    return {};
  }
  const sequential = (constraintResult as { _sequential?: SequentialTrailMeta })._sequential;
  return sequential ?? {};
}

function mergeSequentialMeta(
  constraintResult: unknown,
  patch: SequentialTrailMeta
): Prisma.InputJsonValue {
  const base =
    constraintResult && typeof constraintResult === 'object' && !Array.isArray(constraintResult)
      ? { ...(constraintResult as Record<string, unknown>) }
      : {};
  const current = readSequentialMeta(base);
  base._sequential = {
    ...current,
    ...patch,
  };
  return base as Prisma.InputJsonValue;
}

/**
 * Resolve the ordered approval chain for an employee.
 *
 * @param companyId - Company the employee belongs to
 * @param employeeId - The leave requester's ID
 * @returns Ordered array of chain links (L1-L4 + HR Partner), skipping empty slots
 */
export async function resolveApprovalChain(
  companyId: string,
  employeeId: string
): Promise<ApprovalChainLink[]> {
  const hierarchy = await prisma.approvalHierarchy.findFirst({
    where: { company_id: companyId, emp_id: employeeId },
    select: {
      level1_approver: true,
      level2_approver: true,
      level3_approver: true,
      level4_approver: true,
      hr_partner: true,
    },
  });

  if (!hierarchy) {
    return [];
  }

  const levels: Array<{ level: number; id: string | null; label: string }> = [
    { level: 1, id: hierarchy.level1_approver, label: 'L1 Approver' },
    { level: 2, id: hierarchy.level2_approver, label: 'L2 Approver' },
    { level: 3, id: hierarchy.level3_approver, label: 'L3 Approver' },
    { level: 4, id: hierarchy.level4_approver, label: 'L4 Approver' },
    { level: HR_PARTNER_LEVEL, id: hierarchy.hr_partner, label: 'HR Partner' },
  ];

  return levels
    .filter((link): link is { level: number; id: string; label: string } =>
      Boolean(link.id && link.id.trim())
    )
    .map((link) => ({
      level: link.level,
      approverId: link.id,
      label: link.label,
    }));
}

/**
 * Check whether a specific approver can act on a leave request,
 * enforcing sequential order.
 *
 * @param requestId - Leave request ID
 * @param approverId - The employee trying to approve/reject
 * @param approverRole - Primary role of the approver
 * @returns Check result with level info and next approver
 */
export async function checkSequentialApproval(
  requestId: string,
  approverId: string,
  approverRole: string
): Promise<SequentialCheckResult> {
  const request = await prisma.leaveRequest.findUnique({
    where: { id: requestId },
    select: {
      emp_id: true,
      company_id: true,
      status: true,
      constraint_result: true,
    },
  });

  if (!request) {
    return { isAllowed: false, reason: 'request_not_found', approverLevel: null, isFinalApproval: false, nextApproverId: null };
  }

  const sequential = readSequentialMeta(request.constraint_result);
  const currentLevel = sequential.approval_level ?? 0;

  const chain = await resolveApprovalChain(request.company_id, request.emp_id);

  // If no approval hierarchy exists, fall back to single-step approval
  if (chain.length === 0) {
    return {
      isAllowed: true,
      reason: 'no_chain_single_step',
      approverLevel: 1,
      isFinalApproval: true,
      nextApproverId: null,
    };
  }

  const approverIndex = chain.findIndex((link) => link.approverId === approverId);

  // HR/admin/director can always reject at any point (safety valve)
  const isPrivilegedRole = ['hr', 'admin', 'director', 'super_admin'].includes(
    approverRole.toLowerCase()
  );

  if (approverIndex === -1 && !isPrivilegedRole) {
    return {
      isAllowed: false,
      reason: 'not_in_approval_chain',
      approverLevel: null,
      isFinalApproval: false,
      nextApproverId: null,
    };
  }

  // Find the next expected approver in the chain
  const completedLevels = getCompletedLevels(sequential.approval_trail);
  const nextPendingLink = chain.find(
    (link) => !completedLevels.includes(link.level)
  );

  if (!nextPendingLink) {
    // All levels already approved — shouldn't reach here normally
    return {
      isAllowed: false,
      reason: 'all_levels_completed',
      approverLevel: null,
      isFinalApproval: false,
      nextApproverId: null,
    };
  }

  const isTheirTurn = nextPendingLink.approverId === approverId;

  // Privileged roles can approve out of order if they're in the chain
  if (isPrivilegedRole && approverIndex !== -1) {
    const isAfterNext = chain[approverIndex].level >= nextPendingLink.level;
    if (isAfterNext) {
      const afterIndex = approverIndex + 1;
      const nextAfterThis = afterIndex < chain.length ? chain[afterIndex] : null;
      return {
        isAllowed: true,
        reason: 'privileged_in_chain',
        approverLevel: chain[approverIndex].level,
        isFinalApproval: !nextAfterThis,
        nextApproverId: nextAfterThis?.approverId ?? null,
      };
    }
  }

  if (!isTheirTurn) {
    return {
      isAllowed: false,
      reason: `waiting_for_level_${nextPendingLink.level}`,
      approverLevel: approverIndex !== -1 ? chain[approverIndex].level : null,
      isFinalApproval: false,
      nextApproverId: nextPendingLink.approverId,
    };
  }

  const afterIndex = chain.indexOf(nextPendingLink) + 1;
  const nextAfterThis = afterIndex < chain.length ? chain[afterIndex] : null;

  return {
    isAllowed: true,
    reason: 'sequential_order_valid',
    approverLevel: nextPendingLink.level,
    isFinalApproval: !nextAfterThis,
    nextApproverId: nextAfterThis?.approverId ?? null,
  };
}

/**
 * Record an approval step in the trail and advance the level.
 *
 * @param requestId - Leave request ID
 * @param entry - The trail entry to record
 * @param isFinalApproval - Whether this completes the chain
 * @param nextApproverId - Next approver to notify, if any
 */
export async function recordApprovalStep(
  requestId: string,
  entry: ApprovalTrailEntry,
  isFinalApproval: boolean,
  nextApproverId: string | null
): Promise<void> {
  const request = await prisma.leaveRequest.findUnique({
    where: { id: requestId },
    select: { constraint_result: true },
  });

  const sequential = readSequentialMeta(request?.constraint_result);
  const existingTrail = parseApprovalTrail(sequential.approval_trail);
  existingTrail.push(entry);

  await prisma.leaveRequest.update({
    where: { id: requestId },
    data: {
      constraint_result: mergeSequentialMeta(request?.constraint_result, {
        approval_level: entry.level,
        approval_trail: existingTrail,
      }),
      approval_level: entry.level,
      current_approver_id: isFinalApproval ? null : nextApproverId,
      updated_at: new Date(),
    },
  });
}

/**
 * Build an ApprovalTrailEntry from the current context.
 */
export function buildTrailEntry(
  level: number,
  approverId: string,
  approverName: string,
  action: 'approve' | 'reject',
  comments: string | null
): ApprovalTrailEntry {
  return {
    level,
    approverId,
    approverName,
    action,
    timestamp: new Date().toISOString(),
    comments,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse the JSON approval trail from the database.
 */
function parseApprovalTrail(raw: unknown): ApprovalTrailEntry[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as ApprovalTrailEntry[];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Extract the set of levels that have already been approved.
 */
function getCompletedLevels(raw: unknown): number[] {
  const trail = parseApprovalTrail(raw);
  return trail
    .filter((entry) => entry.action === 'approve')
    .map((entry) => entry.level);
}
