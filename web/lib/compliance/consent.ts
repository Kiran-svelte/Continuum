import prisma from '@/lib/prisma';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ConsentRecord {
  employeeId: string;
  companyId: string;
  consentType: string;
  granted: boolean;
  grantedAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export type ConsentType =
  | 'data_processing'
  | 'email_notifications'
  | 'analytics'
  | 'marketing'
  | 'biometric_data'
  | 'salary_disclosure';

export const CONSENT_TYPES: ConsentType[] = [
  'data_processing',
  'email_notifications',
  'analytics',
  'marketing',
  'biometric_data',
  'salary_disclosure',
];

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Records a consent grant/revocation. Uses notification preferences
 * as the underlying storage and creates an audit log entry.
 */
export async function recordConsent(
  consent: ConsentRecord
): Promise<void> {
  const { employeeId, companyId, consentType, granted, ipAddress, userAgent } = consent;

  // Store consent in notification preferences (extends the model)
  await prisma.notificationPreference.upsert({
    where: {
      emp_id_company_id: {
        emp_id: employeeId,
        company_id: companyId,
      },
    },
    update: {
      reminder_timing: {
        consents: {
          [consentType]: {
            granted,
            updated_at: new Date().toISOString(),
          },
        },
      },
    },
    create: {
      emp_id: employeeId,
      company_id: companyId,
      email_enabled: true,
      push_enabled: true,
      in_app_enabled: true,
      reminder_timing: {
        consents: {
          [consentType]: {
            granted,
            updated_at: new Date().toISOString(),
          },
        },
      },
    },
  });

  // Create audit trail for the consent action
  await createAuditLog({
    companyId,
    actorId: employeeId,
    action: granted ? 'CONSENT_GRANTED' : 'CONSENT_REVOKED',
    entityType: 'consent',
    entityId: employeeId,
    newState: { consentType, granted },
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
  });
}

/** Checks if an employee has granted a specific consent */
export async function hasConsent(
  employeeId: string,
  companyId: string,
  consentType: ConsentType
): Promise<boolean> {
  const pref = await prisma.notificationPreference.findUnique({
    where: {
      emp_id_company_id: {
        emp_id: employeeId,
        company_id: companyId,
      },
    },
    select: { reminder_timing: true },
  });

  if (!pref?.reminder_timing) return false;

  const timing = pref.reminder_timing as Record<string, unknown>;
  const consents = timing.consents as Record<string, { granted: boolean }> | undefined;

  return consents?.[consentType]?.granted ?? false;
}

/** Gets all consent statuses for an employee */
export async function getConsentStatus(
  employeeId: string,
  companyId: string
): Promise<Record<ConsentType, boolean>> {
  const result: Record<string, boolean> = {};

  for (const type of CONSENT_TYPES) {
    result[type] = await hasConsent(employeeId, companyId, type);
  }

  return result as Record<ConsentType, boolean>;
}

/**
 * Generates a compliance report for a company.
 * Summarizes consent metrics across all employees.
 */
export async function generateComplianceReport(
  companyId: string
): Promise<{
  companyId: string;
  generatedAt: string;
  totalEmployees: number;
  consentMetrics: Record<string, { granted: number; total: number }>;
}> {
  const employees = await prisma.employee.findMany({
    where: { org_id: companyId, deleted_at: null },
    select: { id: true },
  });

  const metrics: Record<string, { granted: number; total: number }> = {};

  for (const type of CONSENT_TYPES) {
    let grantedCount = 0;

    for (const emp of employees) {
      const granted = await hasConsent(emp.id, companyId, type);
      if (granted) grantedCount++;
    }

    metrics[type] = {
      granted: grantedCount,
      total: employees.length,
    };
  }

  await createAuditLog({
    companyId,
    actorId: null,
    action: AUDIT_ACTIONS.DATA_EXPORT,
    entityType: 'compliance_report',
    entityId: companyId,
    newState: { type: 'compliance_report', metrics },
  });

  return {
    companyId,
    generatedAt: new Date().toISOString(),
    totalEmployees: employees.length,
    consentMetrics: metrics,
  };
}
