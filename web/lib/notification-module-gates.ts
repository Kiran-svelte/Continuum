import type { ModuleSlug } from '@/lib/core-functions/catalog';

/**
 * Maps notification type strings to the module that owns them.
 * Unknown/system notifications intentionally return null so infrastructure
 * alerts are not lost when a new notification type is introduced.
 */
export function getNotificationModuleSlug(type: string): ModuleSlug | null {
  const normalized = type.trim().toLowerCase();

  if (
    normalized === 'leave_request' ||
    normalized === 'leave_pending_approval' ||
    normalized.startsWith('leave_') ||
    normalized === 'sla_violation' ||
    normalized === 'approval_delegated'
  ) {
    return 'leave';
  }

  if (normalized === 'attendance' || normalized.startsWith('attendance_')) {
    return 'attendance';
  }

  if (
    normalized === 'payslip_published' ||
    normalized === 'payroll_advance' ||
    normalized.startsWith('payroll_')
  ) {
    return 'payroll';
  }

  if (normalized === 'expense' || normalized.startsWith('expense_')) {
    return 'expenses';
  }

  if (normalized === 'travel_request' || normalized.startsWith('travel_')) {
    return 'expenses';
  }

  if (normalized === 'reimbursement' || normalized.startsWith('reimbursement_')) {
    return 'reimbursements';
  }

  if (normalized === 'performance_review_overdue' || normalized.startsWith('performance_')) {
    return 'performance';
  }

  if (normalized === 'learning_overdue' || normalized.startsWith('learning_')) {
    return 'learning';
  }

  if (normalized === 'document' || normalized.startsWith('document_')) {
    return 'documents';
  }

  if (normalized === 'exit_checklist' || normalized.startsWith('exit_')) {
    return 'exit';
  }

  if (
    normalized === 'employee' ||
    normalized === 'employee_update' ||
    normalized === 'movement_decision' ||
    normalized === 'probation_ending'
  ) {
    return 'employees';
  }

  return null;
}
