import { createHash } from 'crypto';
import prisma from '@/lib/prisma';

// ─── Audit Action Constants ─────────────────────────────────────────────────

export const AUDIT_ACTIONS = {
  // Leave actions
  LEAVE_SUBMIT: 'LEAVE_SUBMIT',
  LEAVE_APPROVE: 'LEAVE_APPROVE',
  LEAVE_REJECT: 'LEAVE_REJECT',
  LEAVE_CANCEL: 'LEAVE_CANCEL',
  LEAVE_ESCALATE: 'LEAVE_ESCALATE',
  LEAVE_BALANCE_ADJUST: 'LEAVE_BALANCE_ADJUST',
  LEAVE_ENCASH: 'LEAVE_ENCASH',
  LEAVE_SLA_BREACH: 'LEAVE_SLA_BREACH',
  // Employee actions
  EMPLOYEE_CREATE: 'EMPLOYEE_CREATE',
  EMPLOYEE_UPDATE: 'EMPLOYEE_UPDATE',
  EMPLOYEE_DELETE: 'EMPLOYEE_DELETE',
  EMPLOYEE_STATUS_CHANGE: 'EMPLOYEE_STATUS_CHANGE',
  EMPLOYEE_ROLE_CHANGE: 'EMPLOYEE_ROLE_CHANGE',
  EMPLOYEE_MOVEMENT: 'EMPLOYEE_MOVEMENT',
  // Attendance actions
  ATTENDANCE_CHECK_IN: 'ATTENDANCE_CHECK_IN',
  ATTENDANCE_CHECK_OUT: 'ATTENDANCE_CHECK_OUT',
  ATTENDANCE_REGULARIZE: 'ATTENDANCE_REGULARIZE',
  ATTENDANCE_OVERRIDE: 'ATTENDANCE_OVERRIDE',
  // Payroll actions
  PAYROLL_GENERATE: 'PAYROLL_GENERATE',
  PAYROLL_APPROVE: 'PAYROLL_APPROVE',
  PAYROLL_PROCESS: 'PAYROLL_PROCESS',
  // Company actions
  COMPANY_SETTINGS_UPDATE: 'COMPANY_SETTINGS_UPDATE',
  COMPANY_POLICY_CREATE: 'COMPANY_POLICY_CREATE',
  COMPANY_POLICY_UPDATE: 'COMPANY_POLICY_UPDATE',
  // Security actions
  OTP_VERIFY: 'OTP_VERIFY',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  PERMISSION_CHANGE: 'PERMISSION_CHANGE',
  API_KEY_CREATE: 'API_KEY_CREATE',
  API_KEY_REVOKE: 'API_KEY_REVOKE',
  // Billing actions
  SUBSCRIPTION_CHANGE: 'SUBSCRIPTION_CHANGE',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  // Data actions
  DATA_EXPORT: 'DATA_EXPORT',
  DATA_BACKUP: 'DATA_BACKUP',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CreateAuditLogParams {
  companyId: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditChainResult {
  valid: boolean;
  totalLogs: number;
  verifiedLogs: number;
  brokenAt?: number;
  details?: string;
}

// ─── Core Functions ──────────────────────────────────────────────────────────

/** Computes SHA-256 hash for audit chain integrity */
function computeIntegrityHash(
  action: string,
  entityId: string,
  newState: Record<string, unknown> | null | undefined,
  prevHash: string | null
): string {
  const data = [
    action,
    entityId,
    newState ? JSON.stringify(newState) : '',
    prevHash || '',
  ].join('|');

  return createHash('sha256').update(data).digest('hex');
}

/**
 * Creates an immutable audit log entry with SHA-256 hash chain.
 * Fetches the previous log to chain hashes, ensuring tamper detection.
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<string> {
  const {
    companyId,
    actorId,
    action,
    entityType,
    entityId,
    previousState = null,
    newState = null,
    ipAddress = null,
    userAgent = null,
  } = params;

  // Fetch previous audit log for hash chaining
  const previousLog = await prisma.auditLog.findFirst({
    where: { company_id: companyId },
    orderBy: { created_at: 'desc' },
    select: { integrity_hash: true },
  });

  const prevHash = previousLog?.integrity_hash ?? null;
  const integrityHash = computeIntegrityHash(action, entityId, newState, prevHash);

  const auditLog = await prisma.auditLog.create({
    data: {
      company_id: companyId,
      actor_id: actorId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      previous_state: previousState ?? undefined,
      new_state: newState ?? undefined,
      ip_address: ipAddress,
      user_agent: userAgent,
      integrity_hash: integrityHash,
      prev_hash: prevHash,
    },
  });

  return auditLog.id;
}

/**
 * Verifies the entire audit chain for a company by walking through
 * all logs in chronological order and recomputing hashes.
 */
export async function verifyAuditChain(
  companyId: string
): Promise<AuditChainResult> {
  const logs = await prisma.auditLog.findMany({
    where: { company_id: companyId },
    orderBy: { created_at: 'asc' },
    select: {
      id: true,
      action: true,
      entity_id: true,
      new_state: true,
      integrity_hash: true,
      prev_hash: true,
    },
  });

  if (logs.length === 0) {
    return { valid: true, totalLogs: 0, verifiedLogs: 0 };
  }

  let previousHash: string | null = null;

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];

    // Verify prev_hash link
    if (log.prev_hash !== previousHash) {
      return {
        valid: false,
        totalLogs: logs.length,
        verifiedLogs: i,
        brokenAt: i,
        details: `Hash chain broken at log index ${i} (id: ${log.id}): prev_hash mismatch`,
      };
    }

    // Recompute and verify integrity hash
    const expectedHash = computeIntegrityHash(
      log.action,
      log.entity_id,
      log.new_state as Record<string, unknown> | null,
      previousHash
    );

    if (log.integrity_hash !== expectedHash) {
      return {
        valid: false,
        totalLogs: logs.length,
        verifiedLogs: i,
        brokenAt: i,
        details: `Integrity hash mismatch at log index ${i} (id: ${log.id}): data may have been tampered`,
      };
    }

    previousHash = log.integrity_hash;
  }

  return {
    valid: true,
    totalLogs: logs.length,
    verifiedLogs: logs.length,
  };
}
