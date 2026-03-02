import type { LeaveTypeConfig } from '@/lib/leave-types-config';

// ─── Types ───────────────────────────────────────────────────────────────────

export type RuleCategory = 'validation' | 'business' | 'compliance';

export interface ConstraintRuleConfig {
  rule_id: string;
  name: string;
  description: string;
  category: RuleCategory;
  is_blocking: boolean;
  priority: number;
  config: Record<string, unknown>;
}

export interface CompanyConfig {
  probation_period_days?: number;
  sla_hours?: number;
  work_days?: number[];
  negative_balance?: boolean;
}

// ─── Default Rule Definitions (13 rules) ─────────────────────────────────────

export const DEFAULT_CONSTRAINT_RULES: ConstraintRuleConfig[] = [
  {
    rule_id: 'RULE001',
    name: 'Max Leave Duration',
    description: 'Maximum consecutive days allowed per leave type',
    category: 'validation',
    is_blocking: true,
    priority: 1,
    config: {
      max_days: {
        CL: 3,
        SL: 7,
        PL: 15,
        EL: 15,
        AL: 20,
        ML: 182,
        PTL: 15,
        BL: 5,
        MRL: 5,
        STL: 5,
        WFH: 5,
        OD: 10,
        VOL: 3,
        LWP: 30,
        SAB: 180,
      },
    },
  },
  {
    rule_id: 'RULE002',
    name: 'Leave Balance Check',
    description: 'Cannot exceed available balance (unless negative balance enabled)',
    category: 'validation',
    is_blocking: true,
    priority: 2,
    config: {
      check_pending: true,
      allow_negative: false,
    },
  },
  {
    rule_id: 'RULE003',
    name: 'Min Team Coverage',
    description: 'Minimum percentage of team that must remain present',
    category: 'business',
    is_blocking: true,
    priority: 3,
    config: {
      min_coverage_percent: 60,
      apply_to_department: true,
    },
  },
  {
    rule_id: 'RULE004',
    name: 'Max Concurrent Leave',
    description: 'Maximum employees on leave simultaneously from same department',
    category: 'business',
    is_blocking: true,
    priority: 4,
    config: {
      max_concurrent: 2,
      scope: 'department',
    },
  },
  {
    rule_id: 'RULE005',
    name: 'Blackout Period',
    description: 'Company-wide blocked dates where leave is not allowed (except emergency)',
    category: 'business',
    is_blocking: true,
    priority: 5,
    config: {
      blackout_dates: [],
      exempt_leave_types: ['SL', 'BL', 'ML'],
    },
  },
  {
    rule_id: 'RULE006',
    name: 'Advance Notice',
    description: 'Minimum notice days required before leave start date',
    category: 'validation',
    is_blocking: false,
    priority: 6,
    config: {
      notice_days: {
        CL: 1,
        SL: 0,
        PL: 7,
        EL: 7,
        AL: 7,
        ML: 30,
        PTL: 7,
        BL: 0,
        MRL: 14,
        STL: 7,
        WFH: 1,
        OD: 1,
        VOL: 3,
        LWP: 7,
        SAB: 30,
      },
    },
  },
  {
    rule_id: 'RULE007',
    name: 'Consecutive Leave Limit',
    description: 'Maximum consecutive leave days per type in a rolling period',
    category: 'validation',
    is_blocking: false,
    priority: 7,
    config: {
      max_consecutive: {
        CL: 3,
        SL: 7,
        default: 10,
      },
      rolling_period_days: 30,
    },
  },
  {
    rule_id: 'RULE008',
    name: 'Sandwich Rule',
    description: 'Weekends/holidays between two leave periods count as leave days',
    category: 'business',
    is_blocking: true,
    priority: 8,
    config: {
      enabled: true,
      apply_to: ['CL', 'PL', 'EL', 'AL'],
      exempt: ['SL', 'ML', 'BL'],
    },
  },
  {
    rule_id: 'RULE009',
    name: 'Min Gap Between Leaves',
    description: 'Minimum days between two separate leave requests',
    category: 'business',
    is_blocking: false,
    priority: 9,
    config: {
      min_gap_days: 7,
      apply_to_same_type: true,
    },
  },
  {
    rule_id: 'RULE010',
    name: 'Probation Restriction',
    description: 'Restrict leave during probation period',
    category: 'compliance',
    is_blocking: true,
    priority: 10,
    config: {
      probation_months: 6,
      allowed_during_probation: ['SL', 'CL'],
      max_during_probation: { SL: 3, CL: 3 },
    },
  },
  {
    rule_id: 'RULE011',
    name: 'Critical Project Freeze',
    description: 'No leave allowed during critical project periods',
    category: 'business',
    is_blocking: true,
    priority: 11,
    config: {
      freeze_periods: [],
      exempt_leave_types: ['SL', 'BL', 'ML'],
    },
  },
  {
    rule_id: 'RULE012',
    name: 'Document Requirement',
    description: 'Medical/supporting documents required for specific conditions',
    category: 'compliance',
    is_blocking: false,
    priority: 12,
    config: {
      require_document_after_days: 3,
      require_for_types: ['SL', 'ML'],
      require_for_all_above_days: 5,
    },
  },
  {
    rule_id: 'RULE013',
    name: 'Monthly Quota',
    description: 'Maximum leave days allowed per month per type',
    category: 'validation',
    is_blocking: true,
    priority: 13,
    config: {
      monthly_max: {
        CL: 3,
        SL: 3,
        default: 5,
      },
    },
  },
];

// ─── Functions ───────────────────────────────────────────────────────────────

/**
 * Auto-generates constraint rules based on the selected leave types
 * and company configuration.
 */
export function generateConstraintRules(
  leaveTypes: LeaveTypeConfig[],
  companyConfig?: CompanyConfig
): ConstraintRuleConfig[] {
  const typeCodes = leaveTypes.map((lt) => lt.code);
  const rules = DEFAULT_CONSTRAINT_RULES.map((rule) => {
    const cloned: ConstraintRuleConfig = {
      ...rule,
      config: { ...rule.config },
    };

    // Customize RULE001 max_days based on selected leave types
    if (rule.rule_id === 'RULE001' && cloned.config.max_days) {
      const maxDays = cloned.config.max_days as Record<string, number>;
      const filtered: Record<string, number> = {};
      for (const code of typeCodes) {
        if (code in maxDays) {
          filtered[code] = maxDays[code];
        } else {
          const lt = leaveTypes.find((l) => l.code === code);
          if (lt) filtered[code] = lt.defaultQuota;
        }
      }
      cloned.config.max_days = filtered;
    }

    // Customize RULE002 based on company negative balance setting
    if (rule.rule_id === 'RULE002' && companyConfig?.negative_balance !== undefined) {
      cloned.config.allow_negative = companyConfig.negative_balance;
    }

    // Customize RULE006 notice_days - only include selected types
    if (rule.rule_id === 'RULE006' && cloned.config.notice_days) {
      const noticeDays = cloned.config.notice_days as Record<string, number>;
      const filtered: Record<string, number> = {};
      for (const code of typeCodes) {
        if (code in noticeDays) {
          filtered[code] = noticeDays[code];
        }
      }
      cloned.config.notice_days = filtered;
    }

    // Customize RULE010 probation based on company config
    if (rule.rule_id === 'RULE010' && companyConfig?.probation_period_days) {
      cloned.config.probation_months = Math.ceil(companyConfig.probation_period_days / 30);
    }

    return cloned;
  });

  return rules;
}

/** Returns a rule definition by its ID */
export function getRuleById(ruleId: string): ConstraintRuleConfig | undefined {
  return DEFAULT_CONSTRAINT_RULES.find((r) => r.rule_id === ruleId);
}

/** Returns all rules of a given category */
export function getRulesByCategory(category: RuleCategory): ConstraintRuleConfig[] {
  return DEFAULT_CONSTRAINT_RULES.filter((r) => r.category === category);
}
