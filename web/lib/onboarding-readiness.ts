export type ReadinessStatus = 'pass' | 'warn' | 'fail';

export interface OnboardingReadinessCheck {
  id: string;
  label: string;
  status: ReadinessStatus;
  required: boolean;
  detail: string;
}

export interface OnboardingReadinessResult {
  score: number;
  status: 'pass' | 'warn' | 'fail';
  checks: OnboardingReadinessCheck[];
  blockingItems: string[];
  nextActions: string[];
}

export interface OnboardingReadinessInput {
  company?: {
    name?: string;
    timezone?: string;
  };
  roles?: Array<{
    authority_level?: number;
    authorityLevel?: number;
  }>;
  leave_types?: Array<{ enabled?: boolean }>;
  leaveTypes?: Array<{ enabled?: boolean }>;
  attendance?: {
    enabled?: boolean;
    working_days?: number[];
    workingDays?: number[];
  };
  payroll?: {
    salaryPayDay?: number;
    salary_pay_day?: number;
    payrollCurrency?: string;
    payroll_currency?: string;
  };
  holidays?: Array<{ enabled?: boolean }>;
  notifications?: {
    email_notifications?: boolean;
    manager_alerts?: boolean;
    daily_digest?: boolean;
    sla_alerts?: boolean;
    emailNotifications?: boolean;
    managerAlerts?: boolean;
    dailyDigest?: boolean;
    slaAlerts?: boolean;
  };
  ai_settings?: {
    enabled?: boolean;
    confidence_threshold?: number;
    confidenceThreshold?: number;
  };
  ai?: {
    enabled?: boolean;
    confidence_threshold?: number;
    confidenceThreshold?: number;
  };
  escalation_rules?: unknown[];
  escalationRules?: unknown[];
}

type WeightedCheck = OnboardingReadinessCheck & { weight: number };

function countEnabledLeaveTypes(input: OnboardingReadinessInput): number {
  const leaveTypes = input.leave_types ?? input.leaveTypes ?? [];
  return leaveTypes.filter((lt) => lt?.enabled !== false).length;
}

function hasOwnerRole(input: OnboardingReadinessInput): boolean {
  const roles = input.roles ?? [];
  return roles.some((role) => {
    const level = typeof role.authority_level === 'number' ? role.authority_level : role.authorityLevel;
    return level === 1;
  });
}

function countEnabledNotificationChannels(input: OnboardingReadinessInput): number {
  const n = input.notifications;
  if (!n) {
    return 0;
  }

  const channels = [
    n.email_notifications ?? n.emailNotifications,
    n.manager_alerts ?? n.managerAlerts,
    n.daily_digest ?? n.dailyDigest,
    n.sla_alerts ?? n.slaAlerts,
  ];

  return channels.filter(Boolean).length;
}

function getAiEnabled(input: OnboardingReadinessInput): boolean {
  const ai = input.ai_settings ?? input.ai;
  return ai?.enabled ?? true;
}

function getAiThreshold(input: OnboardingReadinessInput): number | undefined {
  const ai = input.ai_settings ?? input.ai;
  const threshold = ai?.confidence_threshold ?? ai?.confidenceThreshold;
  return typeof threshold === 'number' ? threshold : undefined;
}

function getEscalationRules(input: OnboardingReadinessInput): unknown[] {
  return input.escalation_rules ?? input.escalationRules ?? [];
}

function normalizeStatus(checks: WeightedCheck[]): 'pass' | 'warn' | 'fail' {
  const hasRequiredFailure = checks.some((c) => c.required && c.status === 'fail');
  if (hasRequiredFailure) {
    return 'fail';
  }

  const hasWarningOrOptionalFail = checks.some((c) => c.status === 'warn' || (!c.required && c.status === 'fail'));
  if (hasWarningOrOptionalFail) {
    return 'warn';
  }

  return 'pass';
}

function computeScore(checks: WeightedCheck[]): number {
  const points = checks.reduce((total, check) => {
    if (check.status === 'pass') {
      return total + check.weight;
    }
    if (check.status === 'warn') {
      return total + check.weight * 0.5;
    }
    return total;
  }, 0);

  return Math.max(0, Math.min(100, Math.round(points)));
}

export function buildOnboardingReadiness(input: OnboardingReadinessInput): OnboardingReadinessResult {
  const roles = input.roles ?? [];
  const enabledLeaveTypeCount = countEnabledLeaveTypes(input);
  const attendanceEnabled = input.attendance?.enabled ?? true;
  const workingDays = input.attendance?.working_days ?? input.attendance?.workingDays ?? [];
  const salaryPayDay = input.payroll?.salaryPayDay ?? input.payroll?.salary_pay_day;
  const payrollCurrency = (input.payroll?.payrollCurrency ?? input.payroll?.payroll_currency ?? '').trim();
  const enabledHolidayCount = (input.holidays ?? []).filter((h) => h?.enabled !== false).length;
  const enabledNotificationChannels = countEnabledNotificationChannels(input);
  const aiEnabled = getAiEnabled(input);
  const aiThreshold = getAiThreshold(input);
  const escalationRules = getEscalationRules(input);

  const checks: WeightedCheck[] = [
    {
      id: 'company-profile',
      label: 'Company profile has required identity fields',
      required: true,
      weight: 20,
      status:
        Boolean(input.company?.name?.trim()) && Boolean(input.company?.timezone?.trim())
          ? 'pass'
          : 'fail',
      detail:
        Boolean(input.company?.name?.trim()) && Boolean(input.company?.timezone?.trim())
          ? 'Company name and timezone are set.'
          : 'Set both company name and timezone before activation.',
    },
    {
      id: 'role-model',
      label: 'Role model defines hierarchy and owner role',
      required: true,
      weight: 20,
      status: roles.length >= 2 && hasOwnerRole(input) ? 'pass' : 'fail',
      detail:
        roles.length >= 2 && hasOwnerRole(input)
          ? `${roles.length} roles configured with owner authority.`
          : 'Configure at least two roles and ensure one role has authority level 1.',
    },
    {
      id: 'leave-policy',
      label: 'Leave policy has at least one enabled leave type',
      required: true,
      weight: 20,
      status: enabledLeaveTypeCount > 0 ? 'pass' : 'fail',
      detail:
        enabledLeaveTypeCount > 0
          ? `${enabledLeaveTypeCount} leave type(s) enabled.`
          : 'Enable at least one leave type to avoid unusable leave workflows.',
    },
    {
      id: 'attendance-baseline',
      label: 'Attendance baseline is operational',
      required: true,
      weight: 15,
      status: attendanceEnabled && workingDays.length > 0 ? 'pass' : 'fail',
      detail:
        attendanceEnabled && workingDays.length > 0
          ? `${workingDays.length} working day(s) configured.`
          : 'Enable attendance and configure at least one working day.',
    },
    {
      id: 'payroll-baseline',
      label: 'Payroll baseline has valid pay day and currency',
      required: true,
      weight: 15,
      status:
        typeof salaryPayDay === 'number' && salaryPayDay >= 1 && salaryPayDay <= 28 && Boolean(payrollCurrency)
          ? 'pass'
          : 'fail',
      detail:
        typeof salaryPayDay === 'number' && salaryPayDay >= 1 && salaryPayDay <= 28 && Boolean(payrollCurrency)
          ? `Pay day is set to day ${salaryPayDay} in ${payrollCurrency}.`
          : 'Set payroll currency and choose a salary pay day between 1 and 28.',
    },
    {
      id: 'holiday-calendar',
      label: 'Holiday calendar is configured for visibility',
      required: false,
      weight: 5,
      status: enabledHolidayCount > 0 ? 'pass' : 'warn',
      detail:
        enabledHolidayCount > 0
          ? `${enabledHolidayCount} holiday date(s) configured.`
          : 'No holidays enabled. This is allowed but may surprise employees.',
    },
    {
      id: 'notifications',
      label: 'At least one notification channel is enabled',
      required: false,
      weight: 3,
      status: enabledNotificationChannels > 0 ? 'pass' : 'warn',
      detail:
        enabledNotificationChannels > 0
          ? `${enabledNotificationChannels} notification channel(s) enabled.`
          : 'No notification channels enabled. Users may miss workflow updates.',
    },
    {
      id: 'ai-governance',
      label: 'AI settings and escalation governance are coherent',
      required: false,
      weight: 2,
      status:
        !aiEnabled ||
        ((aiThreshold === undefined || (aiThreshold >= 0 && aiThreshold <= 1)) && escalationRules.length > 0)
          ? 'pass'
          : 'warn',
      detail:
        !aiEnabled
          ? 'AI approvals are disabled by configuration.'
          : (aiThreshold === undefined || (aiThreshold >= 0 && aiThreshold <= 1)) && escalationRules.length > 0
            ? 'AI threshold and escalation rules are configured.'
            : 'Provide a valid AI confidence threshold and at least one escalation rule.',
    },
  ];

  const status = normalizeStatus(checks);
  const score = computeScore(checks);
  const blockingItems = checks
    .filter((c) => c.required && c.status === 'fail')
    .map((c) => c.detail);

  const nextActions = checks
    .filter((c) => c.status !== 'pass')
    .map((c) => c.detail);

  return {
    score,
    status,
    checks: checks.map(({ weight: _weight, ...check }) => check),
    blockingItems,
    nextActions,
  };
}
