import { LEAVE_TYPE_CATALOG } from '@/lib/leave-types-config';

export interface OnboardingProfileInput {
  industry?: string;
  size?: string;
  country?: string;
  timezone?: string;
}

interface SuggestedRole {
  name: string;
  slug: string;
  authority_level: number;
  can_approve_leaves: boolean;
  can_create_users: boolean;
  color: string;
  description: string;
}

interface SuggestedLeaveType {
  code: string;
  name: string;
  days: number;
  carry_forward: boolean;
  max_carry_forward: number;
  encashment_enabled: boolean;
  encashment_max_days: number;
  paid: boolean;
  enabled: boolean;
}

export interface PersonalizedOnboardingDefaults {
  roles: SuggestedRole[];
  leave_types: SuggestedLeaveType[];
  attendance: {
    enabled: boolean;
    workHoursPerDay: number;
    checkInWindowStart: string;
    checkInWindowEnd: string;
    checkOutWindowStart: string;
    checkOutWindowEnd: string;
    gracePeriodMinutes: number;
    lateMarksToHalfDay: number;
    wfhAllowed: boolean;
    geoFencingEnabled: boolean;
    photoVerificationEnabled: boolean;
    workingDays: number[];
  };
  ai: {
    enabled: boolean;
    confidenceThreshold: number;
    autoApproveMaxDays: number;
    requireTeamCoverage: boolean;
    minTeamCoverage: number;
    autoEscalateTimeoutHours: number;
  };
  notifications: {
    emailNotifications: boolean;
    managerAlerts: boolean;
    dailyDigest: boolean;
    slaAlerts: boolean;
  };
  companyPatch: {
    slaHours: number;
    negativeBal: boolean;
    probationDays: number;
    country: string;
    timezone: string;
  };
}

const ROLE_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'];

function buildRoles(size: string | undefined): SuggestedRole[] {
  const normalized = (size || '').trim();
  const isSmall = normalized === '1-50' || normalized === '51-200';

  const base: SuggestedRole[] = [
    {
      name: 'Admin',
      slug: 'admin',
      authority_level: 1,
      can_approve_leaves: true,
      can_create_users: true,
      color: ROLE_COLORS[0],
      description: 'Company administrator with full access',
    },
  ];

  if (!isSmall) {
    base.push({
      name: 'HR',
      slug: 'hr',
      authority_level: 2,
      can_approve_leaves: true,
      can_create_users: true,
      color: ROLE_COLORS[1],
      description: 'People operations and compliance administration',
    });
  }

  base.push(
    {
      name: 'Manager',
      slug: 'manager',
      authority_level: isSmall ? 2 : 3,
      can_approve_leaves: true,
      can_create_users: false,
      color: ROLE_COLORS[2],
      description: 'Team-level approval and operations',
    },
    {
      name: 'Employee',
      slug: 'employee',
      authority_level: isSmall ? 3 : 4,
      can_approve_leaves: false,
      can_create_users: false,
      color: ROLE_COLORS[4],
      description: 'Self-service workforce user',
    }
  );

  return base;
}

function buildLeaveTypes(industry?: string): SuggestedLeaveType[] {
  void industry;
  const codes = new Set(['CL', 'SL', 'BL', 'LWP']);

  return LEAVE_TYPE_CATALOG.map((lt) => ({
    code: lt.code,
    name: lt.name,
    days: lt.defaultQuota,
    carry_forward: lt.carryForward,
    max_carry_forward: lt.maxCarryForward,
    encashment_enabled: lt.encashmentEnabled,
    encashment_max_days: lt.encashmentMaxDays,
    paid: lt.paid,
    enabled: codes.has(lt.code),
  }));
}

export function buildPersonalizedOnboardingDefaults(
  profile: OnboardingProfileInput
): PersonalizedOnboardingDefaults {
  const industry = profile.industry || 'other';
  const size = profile.size || '';
  const country = (profile.country || 'IN').toUpperCase();
  const timezone = profile.timezone || 'Asia/Kolkata';

  const isLarge = size === '201-1000' || size === '1001+';
  const isManufacturing = industry.toLowerCase().includes('manufacturing');

  return {
    roles: buildRoles(size),
    leave_types: buildLeaveTypes(industry),
    attendance: {
      enabled: true,
      workHoursPerDay: 8,
      checkInWindowStart: isManufacturing ? '07:00' : '08:30',
      checkInWindowEnd: isManufacturing ? '09:00' : '10:00',
      checkOutWindowStart: isManufacturing ? '16:00' : '17:00',
      checkOutWindowEnd: isManufacturing ? '19:00' : '21:00',
      gracePeriodMinutes: isLarge ? 10 : 15,
      lateMarksToHalfDay: 3,
      wfhAllowed: !isManufacturing,
      geoFencingEnabled: isManufacturing,
      photoVerificationEnabled: isManufacturing,
      workingDays: [1, 2, 3, 4, 5],
    },
    ai: {
      enabled: true,
      confidenceThreshold: isLarge ? 0.85 : 0.8,
      autoApproveMaxDays: isLarge ? 2 : 3,
      requireTeamCoverage: true,
      minTeamCoverage: isLarge ? 60 : 50,
      autoEscalateTimeoutHours: isLarge ? 12 : 24,
    },
    notifications: {
      emailNotifications: true,
      managerAlerts: true,
      dailyDigest: true,
      slaAlerts: true,
    },
    companyPatch: {
      slaHours: isLarge ? 24 : 48,
      negativeBal: false,
      probationDays: 180,
      country,
      timezone,
    },
  };
}
