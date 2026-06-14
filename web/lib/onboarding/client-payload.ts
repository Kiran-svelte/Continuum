export const ONBOARDING_DRAFT_KEY = 'continuum-onboarding-draft-v1';

type RoleSlug = 'admin' | 'hr' | 'director' | 'manager' | 'team_lead' | 'employee';
export type RoleModel = 'hr_employee' | 'hr_manager_employee' | 'full_hierarchy';
export type InviteRoleSlug = Extract<RoleSlug, 'hr' | 'manager' | 'employee'>;

const ALLOWED_INVITE_ROLES_BY_MODEL: Record<RoleModel, InviteRoleSlug[]> = {
  hr_employee: ['hr', 'employee'],
  hr_manager_employee: ['hr', 'manager', 'employee'],
  // Keep onboarding invite UX unchanged for full_hierarchy.
  full_hierarchy: ['hr', 'manager', 'employee'],
};

export interface OnboardingDraft {
  profile: {
    fullName: string;
    jobTitle: string;
    roleModel: RoleModel;
  };
  company: {
    name: string;
    industry: string;
    size: string;
    timezone: string;
    workStart: string;
    workEnd: string;
    gracePeriodMinutes: number;
    halfDayHours: number;
  };
  quotas: {
    casual: number;
    sick: number;
    paid: number;
  };
  constraints: {
    minCoveragePercent: number;
    maxConcurrent: number;
  };
  notifications: {
    email: boolean;
    managerAlerts: boolean;
    dailyDigest: boolean;
    slaAlerts: boolean;
  };
  capabilityOwners: {
    peopleOperationsOwner: RoleSlug;
  };
}

export interface TeamInviteInput {
  email: string;
  role: RoleSlug;
}

export function getAllowedInviteRoles(roleModel: RoleModel): InviteRoleSlug[] {
  return [...ALLOWED_INVITE_ROLES_BY_MODEL[roleModel]];
}

export function getDefaultInviteRole(roleModel: RoleModel): InviteRoleSlug {
  const allowedRoles = getAllowedInviteRoles(roleModel);
  return allowedRoles.includes('hr') ? 'hr' : allowedRoles[0];
}

export function coerceInviteRole(roleModel: RoleModel, role: RoleSlug | string | undefined): InviteRoleSlug {
  const allowedRoles = getAllowedInviteRoles(roleModel);
  if (role && allowedRoles.includes(role as InviteRoleSlug)) {
    return role as InviteRoleSlug;
  }
  return getDefaultInviteRole(roleModel);
}

const DEFAULT_DRAFT: OnboardingDraft = {
  profile: {
    fullName: '',
    jobTitle: '',
    roleModel: 'hr_manager_employee',
  },
  company: {
    name: '',
    industry: '',
    size: '1-50',
    timezone: 'Asia/Kolkata',
    workStart: '09:00',
    workEnd: '18:00',
    gracePeriodMinutes: 15,
    halfDayHours: 4,
  },
  quotas: {
    casual: 12,
    sick: 12,
    paid: 18,
  },
  constraints: {
    minCoveragePercent: 60,
    maxConcurrent: 3,
  },
  notifications: {
    email: true,
    managerAlerts: true,
    dailyDigest: true,
    slaAlerts: true,
  },
  capabilityOwners: {
    peopleOperationsOwner: 'hr',
  },
};

function uniqueRoleSlugs(invites: TeamInviteInput[], roleModel: OnboardingDraft['profile']['roleModel']): RoleSlug[] {
  const set = new Set<RoleSlug>(['admin']);

  if (roleModel === 'hr_employee') {
    set.add('hr');
    set.add('employee');
  } else if (roleModel === 'hr_manager_employee') {
    set.add('hr');
    set.add('manager');
    set.add('employee');
  } else {
    set.add('hr');
    set.add('director');
    set.add('manager');
    set.add('team_lead');
    set.add('employee');
  }

  for (const invite of invites) {
    set.add(coerceInviteRole(roleModel, invite.role));
  }

  return Array.from(set);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function readOnboardingDraft(): OnboardingDraft {
  if (typeof window === 'undefined') {
    return DEFAULT_DRAFT;
  }

  try {
    const raw = window.sessionStorage.getItem(ONBOARDING_DRAFT_KEY);
    if (!raw) return DEFAULT_DRAFT;
    const parsed = JSON.parse(raw) as Partial<OnboardingDraft>;
    return {
      profile: { ...DEFAULT_DRAFT.profile, ...(parsed.profile || {}) },
      company: { ...DEFAULT_DRAFT.company, ...(parsed.company || {}) },
      quotas: { ...DEFAULT_DRAFT.quotas, ...(parsed.quotas || {}) },
      constraints: { ...DEFAULT_DRAFT.constraints, ...(parsed.constraints || {}) },
      notifications: { ...DEFAULT_DRAFT.notifications, ...(parsed.notifications || {}) },
      capabilityOwners: {
        peopleOperationsOwner:
          parsed.capabilityOwners?.peopleOperationsOwner ?? DEFAULT_DRAFT.capabilityOwners.peopleOperationsOwner,
      },
    };
  } catch {
    return DEFAULT_DRAFT;
  }
}

export function writeOnboardingDraft(patch: Partial<OnboardingDraft>): OnboardingDraft {
  const currentDraft = readOnboardingDraft();
  const merged = {
    profile: { ...currentDraft.profile, ...(patch.profile || {}) },
    company: { ...currentDraft.company, ...(patch.company || {}) },
    quotas: { ...currentDraft.quotas, ...(patch.quotas || {}) },
    constraints: { ...currentDraft.constraints, ...(patch.constraints || {}) },
    notifications: { ...currentDraft.notifications, ...(patch.notifications || {}) },
    capabilityOwners: {
      peopleOperationsOwner:
        patch.capabilityOwners?.peopleOperationsOwner ?? currentDraft.capabilityOwners.peopleOperationsOwner,
    },
  };

  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(merged));
  }

  return merged;
}

export function clearOnboardingDraft(): void {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(ONBOARDING_DRAFT_KEY);
  }
}

export function buildOnboardingCompletePayload(draft: OnboardingDraft, invites: TeamInviteInput[]) {
  const peopleOperationsOwner = draft.capabilityOwners?.peopleOperationsOwner || 'hr';
  const normalizedInvites = invites
    .map((invite) => ({
      email: invite.email.trim(),
      role: coerceInviteRole(draft.profile.roleModel, invite.role),
    }))
    .filter((invite) => invite.email.length > 0 && isValidEmail(invite.email));

  const roleSlugs = uniqueRoleSlugs(normalizedInvites, draft.profile.roleModel);

  const roleSetup = roleSlugs.map((slug, index) => ({
    slug,
    name: slug.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
    authority_level: Math.max(100 - index * 10, 20),
    description: `${slug.replace(/_/g, ' ')} role configured during onboarding`,
    base_role: slug,
    can_create_users: slug === 'admin' || slug === 'hr',
  }));

  return {
    company: {
      name: draft.company.name.trim(),
      industry: draft.company.industry.trim(),
      size: draft.company.size,
      timezone: draft.company.timezone,
      work_days: [1, 2, 3, 4, 5],
    },
    leave_types: [
      {
        code: 'CL',
        name: 'Casual Leave',
        days: Math.max(0, draft.quotas.casual),
        carry_forward: false,
        max_carry_forward: 0,
        encashment_enabled: false,
        encashment_max_days: 0,
        paid: true,
      },
      {
        code: 'SL',
        name: 'Sick Leave',
        days: Math.max(0, draft.quotas.sick),
        carry_forward: false,
        max_carry_forward: 0,
        encashment_enabled: false,
        encashment_max_days: 0,
        paid: true,
      },
      {
        code: 'PL',
        name: 'Paid Leave',
        days: Math.max(0, draft.quotas.paid),
        carry_forward: true,
        max_carry_forward: Math.max(0, Math.floor(draft.quotas.paid / 2)),
        encashment_enabled: true,
        encashment_max_days: 5,
        paid: true,
      },
    ],
    holidays: [],
    notifications: {
      email_notifications: draft.notifications.email,
      manager_alerts: draft.notifications.managerAlerts,
      daily_digest: draft.notifications.dailyDigest,
      sla_alerts: draft.notifications.slaAlerts,
    },
    constraint_config: {
      min_coverage_percent: Math.min(Math.max(draft.constraints.minCoveragePercent, 0), 100),
      max_concurrent: Math.max(draft.constraints.maxConcurrent, 1),
      blackout_dates: [],
      auto_approve: false,
      auto_approve_threshold: 0.9,
    },
    role_model: draft.profile.roleModel,
    role_setup: {
      roles: roleSetup,
    },
    capability_owners: {
      people_operations: peopleOperationsOwner,
    },
    work_start: draft.company.workStart,
    work_end: draft.company.workEnd,
    grace_period_minutes: Math.max(draft.company.gracePeriodMinutes, 0),
    half_day_hours: Math.max(draft.company.halfDayHours, 1),
    invite_preview: normalizedInvites,
  };
}
