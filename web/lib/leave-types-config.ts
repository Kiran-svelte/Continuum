// ─── Types ───────────────────────────────────────────────────────────────────

export type LeaveCategory = 'common' | 'statutory' | 'special' | 'unpaid';
export type GenderFilter = 'all' | 'male' | 'female';

export interface LeaveTypeConfig {
  code: string;
  name: string;
  defaultQuota: number;
  carryForward: boolean;
  maxCarryForward: number;
  encashmentEnabled: boolean;
  encashmentMaxDays: number;
  paid: boolean;
  genderSpecific: GenderFilter;
  category: LeaveCategory;
  description: string;
}

// ─── Leave Type Catalog (16 types) ──────────────────────────────────────────
//
// IMPORTANT: This catalog is used ONLY during onboarding as a list of
// suggested leave types with industry-standard default quotas.  It is NOT the
// runtime source of truth.  After onboarding, the company's configured leave
// types are stored in the `LeaveType` DB table and all API routes read from
// there.  DO NOT use this catalog as a fallback in API routes.
//

export const LEAVE_TYPE_CATALOG: LeaveTypeConfig[] = [
  // Common
  {
    code: 'CL',
    name: 'Casual Leave',
    defaultQuota: 12,
    carryForward: false,
    maxCarryForward: 0,
    encashmentEnabled: false,
    encashmentMaxDays: 0,
    paid: true,
    genderSpecific: 'all',
    category: 'common',
    description: 'Short-duration personal leave for unforeseen circumstances',
  },
  {
    code: 'SL',
    name: 'Sick Leave',
    defaultQuota: 12,
    carryForward: false,
    maxCarryForward: 0,
    encashmentEnabled: false,
    encashmentMaxDays: 0,
    paid: true,
    genderSpecific: 'all',
    category: 'common',
    description: 'Leave for illness or medical treatment',
  },
  {
    code: 'PL',
    name: 'Privilege Leave',
    defaultQuota: 15,
    carryForward: true,
    maxCarryForward: 15,
    encashmentEnabled: true,
    encashmentMaxDays: 10,
    paid: true,
    genderSpecific: 'all',
    category: 'common',
    description: 'Planned leave that can be carried forward and encashed',
  },
  {
    code: 'EL',
    name: 'Earned Leave',
    defaultQuota: 15,
    carryForward: true,
    maxCarryForward: 30,
    encashmentEnabled: true,
    encashmentMaxDays: 15,
    paid: true,
    genderSpecific: 'all',
    category: 'common',
    description: 'Leave earned through attendance, carries forward',
  },
  {
    code: 'AL',
    name: 'Annual Leave',
    defaultQuota: 20,
    carryForward: true,
    maxCarryForward: 10,
    encashmentEnabled: false,
    encashmentMaxDays: 0,
    paid: true,
    genderSpecific: 'all',
    category: 'common',
    description: 'Annual vacation leave entitlement',
  },
  // Statutory
  {
    code: 'ML',
    name: 'Maternity Leave',
    defaultQuota: 182,
    carryForward: false,
    maxCarryForward: 0,
    encashmentEnabled: false,
    encashmentMaxDays: 0,
    paid: true,
    genderSpecific: 'female',
    category: 'statutory',
    description: 'Maternity leave as per the Maternity Benefit Act (26 weeks)',
  },
  {
    code: 'PTL',
    name: 'Paternity Leave',
    defaultQuota: 15,
    carryForward: false,
    maxCarryForward: 0,
    encashmentEnabled: false,
    encashmentMaxDays: 0,
    paid: true,
    genderSpecific: 'male',
    category: 'statutory',
    description: 'Leave for new fathers around childbirth',
  },
  {
    code: 'BL',
    name: 'Bereavement Leave',
    defaultQuota: 5,
    carryForward: false,
    maxCarryForward: 0,
    encashmentEnabled: false,
    encashmentMaxDays: 0,
    paid: true,
    genderSpecific: 'all',
    category: 'statutory',
    description: 'Leave for mourning the loss of an immediate family member',
  },
  // Special
  {
    code: 'MRL',
    name: 'Marriage Leave',
    defaultQuota: 5,
    carryForward: false,
    maxCarryForward: 0,
    encashmentEnabled: false,
    encashmentMaxDays: 0,
    paid: true,
    genderSpecific: 'all',
    category: 'special',
    description: 'Leave for own marriage ceremony',
  },
  {
    code: 'STL',
    name: 'Study Leave',
    defaultQuota: 5,
    carryForward: false,
    maxCarryForward: 0,
    encashmentEnabled: false,
    encashmentMaxDays: 0,
    paid: false,
    genderSpecific: 'all',
    category: 'special',
    description: 'Unpaid leave for education, exams, or certifications',
  },
  {
    code: 'CMP',
    name: 'Comp Off',
    defaultQuota: 0,
    carryForward: false,
    maxCarryForward: 0,
    encashmentEnabled: false,
    encashmentMaxDays: 0,
    paid: true,
    genderSpecific: 'all',
    category: 'special',
    description: 'Compensatory off earned by working on holidays/weekends',
  },
  {
    code: 'WFH',
    name: 'Work From Home',
    defaultQuota: 52,
    carryForward: false,
    maxCarryForward: 0,
    encashmentEnabled: false,
    encashmentMaxDays: 0,
    paid: true,
    genderSpecific: 'all',
    category: 'special',
    description: 'Work from home day (counted as present)',
  },
  {
    code: 'OD',
    name: 'On Duty',
    defaultQuota: 30,
    carryForward: false,
    maxCarryForward: 0,
    encashmentEnabled: false,
    encashmentMaxDays: 0,
    paid: true,
    genderSpecific: 'all',
    category: 'special',
    description: 'Away from office for official work',
  },
  {
    code: 'VOL',
    name: 'Volunteer Leave',
    defaultQuota: 3,
    carryForward: false,
    maxCarryForward: 0,
    encashmentEnabled: false,
    encashmentMaxDays: 0,
    paid: true,
    genderSpecific: 'all',
    category: 'special',
    description: 'Leave for community service or volunteer work',
  },
  // Unpaid
  {
    code: 'LWP',
    name: 'Leave Without Pay',
    defaultQuota: 365,
    carryForward: false,
    maxCarryForward: 0,
    encashmentEnabled: false,
    encashmentMaxDays: 0,
    paid: false,
    genderSpecific: 'all',
    category: 'unpaid',
    description: 'Unpaid leave when all other leave balances are exhausted',
  },
  {
    code: 'SAB',
    name: 'Sabbatical',
    defaultQuota: 180,
    carryForward: false,
    maxCarryForward: 0,
    encashmentEnabled: false,
    encashmentMaxDays: 0,
    paid: false,
    genderSpecific: 'all',
    category: 'unpaid',
    description: 'Extended unpaid leave for personal development or research',
  },
];

// ─── Functions ───────────────────────────────────────────────────────────────

/** Returns the full leave type catalog */
export function getDefaultLeaveTypes(): LeaveTypeConfig[] {
  return [...LEAVE_TYPE_CATALOG];
}

/** Returns leave types filtered by employee gender */
export function getLeaveTypesForGender(
  gender: 'male' | 'female' | 'other'
): LeaveTypeConfig[] {
  return LEAVE_TYPE_CATALOG.filter((lt) => {
    if (lt.genderSpecific === 'all') return true;
    if (gender === 'other') return true;
    return lt.genderSpecific === gender;
  });
}

/** Returns leave types by category */
export function getLeaveTypesByCategory(
  category: LeaveCategory
): LeaveTypeConfig[] {
  return LEAVE_TYPE_CATALOG.filter((lt) => lt.category === category);
}

/** Finds a leave type by its code */
export function getLeaveTypeByCode(code: string): LeaveTypeConfig | undefined {
  return LEAVE_TYPE_CATALOG.find((lt) => lt.code === code);
}
