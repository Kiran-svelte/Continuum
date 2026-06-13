"use client"

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle2, Info, Loader2, SkipForward, Trash2 } from 'lucide-react';
import { getDefaultPortalForRole, getDefaultPortalForRoles } from '@/lib/auth-routing';
import { fetchWithTimeout, mapFetchErrorMessage } from '@/lib/fetch-with-timeout';
import { writeOnboardingDraft } from '@/lib/onboarding/client-payload';
import { Button } from '@/components/ui/button';
import { Checkbox, Input, Select } from '@/components/ui/input';
import {
  OrgStructureStep,
  ApprovalMappingStep,
  ModuleEnablementStep,
  createDefaultOrgStructure,
  createDefaultApprovalChains,
  createDefaultModules,
  type OrgStructure,
  type ApprovalChain,
  type ModuleConfig,
} from '@/app/onboarding/onboarding-org-steps';
import { filterOnboardingSteps } from '@/lib/onboarding-step-contract';
import { DEFAULT_ENABLED_SLUGS, type ModuleSlug } from '@/lib/core-functions/catalog';

function nextVisibleStep(current: number, visible: number[]): number {
  const idx = visible.indexOf(current);
  if (idx < 0) return visible[0] ?? 1;
  if (idx >= visible.length - 1) return current;
  return visible[idx + 1] ?? current;
}

function prevVisibleStep(current: number, visible: number[]): number {
  const idx = visible.indexOf(current);
  if (idx <= 0) return visible[0] ?? 1;
  return visible[idx - 1] ?? current;
}

type RoleDraft = {
  name: string;
  slug: string;
  authority_level: number;
  can_create_users: boolean;
  can_approve_leaves: boolean;
};

type OwnerRoleSlug = 'admin' | 'hr' | 'director' | 'manager' | 'team_lead' | 'employee';

type LeaveTypeDraft = {
  code: string;
  name: string;
  days: number;
  carry_forward: boolean;
  max_carry_forward: number;
  encashment_enabled: boolean;
  encashment_max_days: number;
  paid: boolean;
  enabled: boolean;
};

type ServerDraftShape = {
  last_completed_step?: number;
  steps?: Record<string, unknown>;
};

type LocalOnboardingProgressDraft = {
  savedAt: string;
  step: number;
  completedSteps: number[];
  skippedSteps: number[];
  company: {
    name: string;
    industry: string;
    size: string;
    timezone: string;
    workStart: string;
    workEnd: string;
    gracePeriodMinutes: number;
    halfDayHours: number;
    slaHours: number;
    negativeBalance: boolean;
    probationDays: number;
    workDays: number[];
  };
  roles: RoleDraft[];
  peopleOpsOwnerRole: OwnerRoleSlug;
  leaveTypes: LeaveTypeDraft[];
  roleQuotas: Array<{ role_slug: string; leave_type_code: string; annual_quota: number }>;
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
  holidays: Array<{ name: string; date: string }>;
  ai: {
    enabled: boolean;
    confidenceThreshold: number;
    autoApproveMaxDays: number;
    requireTeamCoverage: boolean;
    minTeamCoverage: number;
    autoEscalateTimeoutHours: number;
  };
  payroll: {
    pfEnabled: boolean;
    pfCeiling: number;
    esiEnabled: boolean;
    esiCeiling: number;
    ptEnabled: boolean;
    ptState: string;
    tdsEnabled: boolean;
    defaultTaxRegime: 'old' | 'new';
    lopCalculationMethod: 'calendar_days' | 'working_days';
    salaryPayDay: number;
    payrollCurrency: string;
  };
  notifications: {
    emailNotifications: boolean;
    managerAlerts: boolean;
    dailyDigest: boolean;
    slaAlerts: boolean;
  };
  constraints: {
    minCoveragePercent: number;
    maxConcurrent: number;
  };
};

const TOTAL_STEPS = 13;
/** Step save timeout — extended to handle Neon Postgres cold-start latency (can be 20-30s). */
const REQUEST_TIMEOUT_MS = 60_000;
const FINALIZE_REQUEST_TIMEOUT_MS = 120_000;
const ONBOARDING_PROGRESS_STORAGE_KEY = 'continuum:onboarding:progress:v1';

type MePayload = {
  primary_role?: string | null;
  secondary_roles?: string[] | null;
  org_id?: string | null;
  company?: { onboarding_completed?: boolean } | null;
  employee_onboarding_completed?: boolean;
  employee_welcome_pending?: boolean;
};

const STEP_TITLES = [
  'Company Basics',          // 1
  'Org Structure',           // 2 — NEW
  'Approval Mapping',        // 3 — NEW
  'Active Modules',          // 4 — NEW
  'Role Structure',          // 5 (was 2)
  'Leave Types',             // 6 (was 3)
  'Role Quotas',             // 7 (was 4)
  'Attendance Rules',        // 8 (was 5)
  'Holidays',                // 9 (was 6)
  'AI & Automation',         // 10 (was 7)
  'Payroll Defaults',        // 11 (was 8)
  'Notifications',           // 12 (was 9)
  'Finalize Setup',          // 13 (was 10)
];

const STEP_GUIDANCE = [
  'Set up your company identity, timezone, and default workday policy.',
  'Define departments, office locations, cost centers, and your org hierarchy model.',
  'Map who approves leave, expenses, and other workflows at each level.',
  'Choose which HR modules to activate. You can change this any time from Admin settings.',
  'Define your role hierarchy and who owns people operations responsibilities.',
  'Choose leave types and default entitlements available to employees.',
  'Set optional leave quotas by role and leave type.',
  'Configure attendance windows, grace policy, and work mode controls.',
  'Add your company holiday calendar for accurate leave and payroll.',
  'Tune AI recommendation confidence and auto-approval boundaries.',
  'Set statutory payroll defaults like PF, ESI, and salary cycle.',
  'Choose who receives operational notifications and alerts.',
  'Review configuration summary and finalize onboarding.',
];

function InfoHint({
  title,
  examples,
}: {
  title: string;
  examples: string[];
}) {
  return (
    <details className="group rounded-lg border border-[var(--border)]/70 bg-[var(--muted)]/20 px-3 py-2">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-[var(--muted-foreground)]">
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)]">
          <Info className="h-3 w-3" />
        </span>
        <span>{title}</span>
      </summary>
      <ul className="mt-2 space-y-1 text-xs text-[var(--muted-foreground)]">
        {examples.map((example) => (
          <li key={example}>• {example}</li>
        ))}
      </ul>
    </details>
  );
}

export default function OnboardingView() {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [saving, setSaving] = React.useState(false);
  const [loadingDefaults, setLoadingDefaults] = React.useState(true);
  const [error, setError] = React.useState('');
  const [completedSteps, setCompletedSteps] = React.useState<Set<number>>(new Set());
  const [skippedSteps, setSkippedSteps] = React.useState<Set<number>>(new Set());
  const [visibleSteps, setVisibleSteps] = React.useState<number[]>(() =>
    Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1)
  );
  const [moduleCapSlugs, setModuleCapSlugs] = React.useState<ModuleSlug[]>([...DEFAULT_ENABLED_SLUGS]);

  const [company, setCompany] = React.useState({
    name: '',
    industry: '',
    size: '1-50',
    timezone: 'Asia/Kolkata',
    workStart: '09:00',
    workEnd: '18:00',
    gracePeriodMinutes: 15,
    halfDayHours: 4,
    slaHours: 48,
    negativeBalance: false,
    probationDays: 180,
    workDays: [1, 2, 3, 4, 5],
  });

  const [roles, setRoles] = React.useState<RoleDraft[]>([
    { name: 'Admin', slug: 'admin', authority_level: 1, can_create_users: true, can_approve_leaves: true },
    { name: 'HR', slug: 'hr', authority_level: 2, can_create_users: true, can_approve_leaves: true },
    { name: 'Manager', slug: 'manager', authority_level: 3, can_create_users: false, can_approve_leaves: true },
    { name: 'Employee', slug: 'employee', authority_level: 4, can_create_users: false, can_approve_leaves: false },
  ]);
  const [peopleOpsOwnerRole, setPeopleOpsOwnerRole] = React.useState<OwnerRoleSlug>('hr');

  const [leaveTypes, setLeaveTypes] = React.useState<LeaveTypeDraft[]>([]);
  const [roleQuotas, setRoleQuotas] = React.useState<Array<{ role_slug: string; leave_type_code: string; annual_quota: number }>>([]);
  const [attendance, setAttendance] = React.useState({
    enabled: true,
    workHoursPerDay: 8,
    checkInWindowStart: '08:30',
    checkInWindowEnd: '10:00',
    checkOutWindowStart: '17:00',
    checkOutWindowEnd: '21:00',
    gracePeriodMinutes: 15,
    lateMarksToHalfDay: 3,
    wfhAllowed: true,
    geoFencingEnabled: false,
    photoVerificationEnabled: false,
    workingDays: [1, 2, 3, 4, 5],
  });
  const [holidays, setHolidays] = React.useState<Array<{ name: string; date: string }>>([]);
  const [ai, setAi] = React.useState({
    enabled: true,
    confidenceThreshold: 0.8,
    autoApproveMaxDays: 2,
    requireTeamCoverage: true,
    minTeamCoverage: 50,
    autoEscalateTimeoutHours: 24,
  });
  const [payroll, setPayroll] = React.useState({
    pfEnabled: true,
    pfCeiling: 15000,
    esiEnabled: true,
    esiCeiling: 21000,
    ptEnabled: true,
    ptState: 'default',
    tdsEnabled: true,
    defaultTaxRegime: 'new' as 'old' | 'new',
    lopCalculationMethod: 'working_days' as 'calendar_days' | 'working_days',
    salaryPayDay: 28,
    payrollCurrency: 'INR',
  });
  const [notifications, setNotifications] = React.useState({
    emailNotifications: true,
    managerAlerts: true,
    dailyDigest: true,
    slaAlerts: true,
  });
  const [constraints, setConstraints] = React.useState({
    minCoveragePercent: 60,
    maxConcurrent: 3,
  });

  // ─── New Zoho-parity org design state ──────────────────────────────────────
  const [orgStructure, setOrgStructure] = React.useState<OrgStructure>(createDefaultOrgStructure);
  const [approvalChains, setApprovalChains] = React.useState<ApprovalChain[]>(createDefaultApprovalChains);
  const [modules, setModules] = React.useState<ModuleConfig[]>(createDefaultModules);

  React.useEffect(() => {
    let canceled = false;

    async function enforceRoleScopedOnboarding() {
      try {
        const meResponse = await fetchWithTimeout('/api/auth/me', { credentials: 'include' }, REQUEST_TIMEOUT_MS);
        if (!meResponse.ok || canceled) {
          return;
        }

        const me = (await meResponse.json()) as MePayload;
        const role = (me.primary_role || '').toLowerCase();
        if (role === 'admin' && (!me.org_id || me.company?.onboarding_completed === false)) {
          router.replace('/onboarding');
          return;
        }

        if (!role || role === 'admin' || role === 'super_admin') {
          return;
        }

        if (me.employee_onboarding_completed === false) {
          router.replace('/employee/onboarding');
          return;
        }

        if (me.employee_welcome_pending === true) {
          router.replace('/employee/welcome');
          return;
        }

        router.replace(getDefaultPortalForRoles(me.primary_role, me.secondary_roles));
      } catch {
        // Middleware/server guards remain authoritative if this best-effort check fails.
      }
    }

    void enforceRoleScopedOnboarding();

    return () => {
      canceled = true;
    };
  }, [router]);

  const applyStepPayload = React.useCallback((targetStep: number, payload: unknown) => {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return;
    }

    const data = payload as Record<string, unknown>;

    if (targetStep === 1) {
      setCompany((prev) => ({
        ...prev,
        name: typeof data.companyName === 'string' ? data.companyName : prev.name,
        industry: typeof data.industry === 'string' ? data.industry : prev.industry,
        size: typeof data.employeeCount === 'string' ? data.employeeCount : prev.size,
        timezone: typeof data.timezone === 'string' ? data.timezone : prev.timezone,
        slaHours: typeof data.slaHours === 'number' ? data.slaHours : prev.slaHours,
        negativeBalance: typeof data.negativeBal === 'boolean' ? data.negativeBal : prev.negativeBalance,
        probationDays: typeof data.probationDays === 'number' ? data.probationDays : prev.probationDays,
        workStart: typeof data.workStart === 'string' ? data.workStart : prev.workStart,
        workEnd: typeof data.workEnd === 'string' ? data.workEnd : prev.workEnd,
        gracePeriodMinutes: typeof data.gracePeriodMinutes === 'number' ? data.gracePeriodMinutes : prev.gracePeriodMinutes,
        halfDayHours: typeof data.halfDayHours === 'number' ? data.halfDayHours : prev.halfDayHours,
      }));
      return;
    }

    if (targetStep === 2) {
      if (Array.isArray(data.roles)) {
        const nextRoles = data.roles
          .filter((role): role is RoleDraft => typeof role === 'object' && role !== null)
          .map((role) => ({
            name: typeof role.name === 'string' ? role.name : 'Role',
            slug: typeof role.slug === 'string' ? role.slug : 'employee',
            authority_level: typeof role.authority_level === 'number' ? role.authority_level : 10,
            can_create_users: typeof role.can_create_users === 'boolean' ? role.can_create_users : false,
            can_approve_leaves: typeof role.can_approve_leaves === 'boolean' ? role.can_approve_leaves : false,
          }));

        if (nextRoles.length > 0) {
          setRoles(nextRoles);
        }
      }

      const capabilityOwners = data.capabilityOwners;
      if (
        capabilityOwners &&
        typeof capabilityOwners === 'object' &&
        !Array.isArray(capabilityOwners) &&
        typeof (capabilityOwners as Record<string, unknown>).peopleOperationsOwner === 'string'
      ) {
        setPeopleOpsOwnerRole((capabilityOwners as Record<string, unknown>).peopleOperationsOwner as OwnerRoleSlug);
      }
      return;
    }

    if (targetStep === 3 && Array.isArray(data.leaveTypes)) {
      const nextLeaveTypes = data.leaveTypes
        .filter((leaveType): leaveType is LeaveTypeDraft => typeof leaveType === 'object' && leaveType !== null)
        .map((leaveType) => ({
          code: typeof leaveType.code === 'string' ? leaveType.code : 'CL',
          name: typeof leaveType.name === 'string' ? leaveType.name : 'Casual Leave',
          days: typeof leaveType.days === 'number' ? leaveType.days : 0,
          carry_forward: typeof leaveType.carry_forward === 'boolean' ? leaveType.carry_forward : false,
          max_carry_forward: typeof leaveType.max_carry_forward === 'number' ? leaveType.max_carry_forward : 0,
          encashment_enabled: typeof leaveType.encashment_enabled === 'boolean' ? leaveType.encashment_enabled : false,
          encashment_max_days: typeof leaveType.encashment_max_days === 'number' ? leaveType.encashment_max_days : 0,
          paid: typeof leaveType.paid === 'boolean' ? leaveType.paid : true,
          enabled: typeof leaveType.enabled === 'boolean' ? leaveType.enabled : true,
        }));

      setLeaveTypes(nextLeaveTypes);
      return;
    }

    if (targetStep === 4 && Array.isArray(data.roleQuotas)) {
      const nextRoleQuotas = data.roleQuotas
        .filter((quota): quota is { role_slug: string; leave_type_code: string; annual_quota: number } =>
          typeof quota === 'object' &&
          quota !== null &&
          typeof (quota as Record<string, unknown>).role_slug === 'string' &&
          typeof (quota as Record<string, unknown>).leave_type_code === 'string' &&
          typeof (quota as Record<string, unknown>).annual_quota === 'number'
        );

      setRoleQuotas(nextRoleQuotas);
      return;
    }

    if (targetStep === 5) {
      setAttendance((prev) => ({
        ...prev,
        enabled: typeof data.enabled === 'boolean' ? data.enabled : prev.enabled,
        workHoursPerDay: typeof data.workHoursPerDay === 'number' ? data.workHoursPerDay : prev.workHoursPerDay,
        checkInWindowStart: typeof data.checkInWindowStart === 'string' ? data.checkInWindowStart : prev.checkInWindowStart,
        checkInWindowEnd: typeof data.checkInWindowEnd === 'string' ? data.checkInWindowEnd : prev.checkInWindowEnd,
        checkOutWindowStart: typeof data.checkOutWindowStart === 'string' ? data.checkOutWindowStart : prev.checkOutWindowStart,
        checkOutWindowEnd: typeof data.checkOutWindowEnd === 'string' ? data.checkOutWindowEnd : prev.checkOutWindowEnd,
        gracePeriodMinutes: typeof data.gracePeriodMinutes === 'number' ? data.gracePeriodMinutes : prev.gracePeriodMinutes,
        lateMarksToHalfDay: typeof data.lateMarksToHalfDay === 'number' ? data.lateMarksToHalfDay : prev.lateMarksToHalfDay,
        wfhAllowed: typeof data.wfhAllowed === 'boolean' ? data.wfhAllowed : prev.wfhAllowed,
        geoFencingEnabled: typeof data.geoFencingEnabled === 'boolean' ? data.geoFencingEnabled : prev.geoFencingEnabled,
        photoVerificationEnabled: typeof data.photoVerificationEnabled === 'boolean' ? data.photoVerificationEnabled : prev.photoVerificationEnabled,
        workingDays: Array.isArray(data.workingDays)
          ? data.workingDays.filter((day): day is number => typeof day === 'number')
          : prev.workingDays,
      }));
      return;
    }

    if (targetStep === 6 && Array.isArray(data.holidays)) {
      const nextHolidays = data.holidays
        .filter((holiday): holiday is { name: string; date: string } =>
          typeof holiday === 'object' &&
          holiday !== null &&
          typeof (holiday as Record<string, unknown>).name === 'string' &&
          typeof (holiday as Record<string, unknown>).date === 'string'
        );

      setHolidays(nextHolidays);
      return;
    }

    if (targetStep === 7) {
      setAi((prev) => ({
        ...prev,
        enabled: typeof data.enabled === 'boolean' ? data.enabled : prev.enabled,
        confidenceThreshold: typeof data.confidenceThreshold === 'number' ? data.confidenceThreshold : prev.confidenceThreshold,
        autoApproveMaxDays: typeof data.autoApproveMaxDays === 'number' ? data.autoApproveMaxDays : prev.autoApproveMaxDays,
        requireTeamCoverage: typeof data.requireTeamCoverage === 'boolean' ? data.requireTeamCoverage : prev.requireTeamCoverage,
        minTeamCoverage: typeof data.minTeamCoverage === 'number' ? data.minTeamCoverage : prev.minTeamCoverage,
        autoEscalateTimeoutHours: typeof data.autoEscalateTimeoutHours === 'number' ? data.autoEscalateTimeoutHours : prev.autoEscalateTimeoutHours,
      }));
      return;
    }

    if (targetStep === 8) {
      setPayroll((prev) => ({
        ...prev,
        pfEnabled: typeof data.pfEnabled === 'boolean' ? data.pfEnabled : prev.pfEnabled,
        pfCeiling: typeof data.pfCeiling === 'number' ? data.pfCeiling : prev.pfCeiling,
        esiEnabled: typeof data.esiEnabled === 'boolean' ? data.esiEnabled : prev.esiEnabled,
        esiCeiling: typeof data.esiCeiling === 'number' ? data.esiCeiling : prev.esiCeiling,
        ptEnabled: typeof data.ptEnabled === 'boolean' ? data.ptEnabled : prev.ptEnabled,
        ptState: typeof data.ptState === 'string' ? data.ptState : prev.ptState,
        tdsEnabled: typeof data.tdsEnabled === 'boolean' ? data.tdsEnabled : prev.tdsEnabled,
        defaultTaxRegime:
          data.defaultTaxRegime === 'old' || data.defaultTaxRegime === 'new'
            ? data.defaultTaxRegime
            : prev.defaultTaxRegime,
        lopCalculationMethod:
          data.lopCalculationMethod === 'calendar_days' || data.lopCalculationMethod === 'working_days'
            ? data.lopCalculationMethod
            : prev.lopCalculationMethod,
        salaryPayDay: typeof data.salaryPayDay === 'number' ? data.salaryPayDay : prev.salaryPayDay,
        payrollCurrency: typeof data.payrollCurrency === 'string' ? data.payrollCurrency : prev.payrollCurrency,
      }));
      return;
    }

    if (targetStep === 9) {
      setNotifications((prev) => ({
        ...prev,
        emailNotifications: typeof data.emailNotifications === 'boolean' ? data.emailNotifications : prev.emailNotifications,
        managerAlerts: typeof data.managerAlerts === 'boolean' ? data.managerAlerts : prev.managerAlerts,
        dailyDigest: typeof data.dailyDigest === 'boolean' ? data.dailyDigest : prev.dailyDigest,
        slaAlerts: typeof data.slaAlerts === 'boolean' ? data.slaAlerts : prev.slaAlerts,
      }));
    }
  }, []);

  const applyLocalProgressDraft = React.useCallback((draft: LocalOnboardingProgressDraft) => {
    setStep(Math.min(Math.max(draft.step, 1), TOTAL_STEPS));
    setCompletedSteps(new Set(draft.completedSteps));
    setSkippedSteps(new Set(draft.skippedSteps));
    setCompany(draft.company);
    setRoles(draft.roles);
    setPeopleOpsOwnerRole(draft.peopleOpsOwnerRole);
    setLeaveTypes(draft.leaveTypes);
    setRoleQuotas(draft.roleQuotas);
    setAttendance(draft.attendance);
    setHolidays(draft.holidays);
    setAi(draft.ai);
    setPayroll(draft.payroll);
    setNotifications(draft.notifications);
    setConstraints(draft.constraints);
  }, []);

  React.useEffect(() => {
    const loadDefaults = async () => {
      setLoadingDefaults(true);

      const localDraftRaw = window.localStorage.getItem(ONBOARDING_PROGRESS_STORAGE_KEY);
      if (localDraftRaw) {
        try {
          const localDraft = JSON.parse(localDraftRaw) as LocalOnboardingProgressDraft;
          if (localDraft && typeof localDraft === 'object') {
            applyLocalProgressDraft(localDraft);
          }
        } catch {
          window.localStorage.removeItem(ONBOARDING_PROGRESS_STORAGE_KEY);
        }
      }

      try {
        const response = await fetchWithTimeout('/api/onboarding/defaults', { credentials: 'include' }, REQUEST_TIMEOUT_MS);
        const payload = await response.json().catch(() => ({}));
        if (response.status === 401) {
          router.replace('/sign-in?redirect=/onboarding');
          return;
        }
        if (!response.ok && payload?.error) {
          setError(String(payload.error));
        }
        if (response.ok && payload?.defaults) {
          const defaults = payload.defaults as {
            roles?: RoleDraft[];
            leave_types?: LeaveTypeDraft[];
            attendance?: typeof attendance;
            ai?: typeof ai;
            notifications?: typeof notifications;
            companyPatch?: { slaHours?: number; negativeBal?: boolean; probationDays?: number; timezone?: string };
          };
          if (Array.isArray(defaults.roles) && defaults.roles.length > 0) setRoles(defaults.roles);
          if (Array.isArray(defaults.leave_types)) setLeaveTypes(defaults.leave_types);
          if (defaults.attendance) setAttendance((prev) => ({ ...prev, ...defaults.attendance }));
          if (defaults.ai) setAi((prev) => ({ ...prev, ...defaults.ai }));
          if (defaults.notifications) setNotifications((prev) => ({ ...prev, ...defaults.notifications }));
          if (defaults.companyPatch) {
            setCompany((prev) => ({
              ...prev,
              slaHours: defaults.companyPatch?.slaHours ?? prev.slaHours,
              negativeBalance: defaults.companyPatch?.negativeBal ?? prev.negativeBalance,
              probationDays: defaults.companyPatch?.probationDays ?? prev.probationDays,
              timezone: defaults.companyPatch?.timezone ?? prev.timezone,
            }));
          }
        }

        const stepResponse = await fetchWithTimeout('/api/onboarding/step/all', { credentials: 'include' }, REQUEST_TIMEOUT_MS);
        const stepPayload = await stepResponse.json().catch(() => ({}));
        if (stepResponse.status === 401) {
          router.replace('/sign-in?redirect=/onboarding');
          return;
        }
        if (stepResponse.ok && stepPayload?.draft) {
          const draft = stepPayload.draft as ServerDraftShape;
          const stepEntries = Object.entries(draft.steps ?? {})
            .map(([rawStep, payload]) => ({ stepNumber: Number(rawStep), payload }))
            .filter((entry) => Number.isInteger(entry.stepNumber) && entry.stepNumber >= 1 && entry.stepNumber <= TOTAL_STEPS)
            .sort((a, b) => a.stepNumber - b.stepNumber);

          stepEntries.forEach((entry) => {
            applyStepPayload(entry.stepNumber, entry.payload);
          });

          const completed = new Set(stepEntries.map((entry) => entry.stepNumber));
          if (completed.size > 0) {
            setCompletedSteps(completed);
          }

          const lastCompleted =
            typeof draft.last_completed_step === 'number'
              ? Math.min(Math.max(draft.last_completed_step, 0), TOTAL_STEPS)
              : (stepEntries.length > 0 ? stepEntries[stepEntries.length - 1].stepNumber : 0);

          const resumeStep = Math.min(Math.max(lastCompleted + 1, 1), TOTAL_STEPS);
          setStep(resumeStep);
        }

        // Pre-populate company name from the signed-in user's company record
        // so the admin doesn't have to re-type it in Step 1.
        const meResponse = await fetchWithTimeout('/api/auth/me', { credentials: 'include' }, REQUEST_TIMEOUT_MS);
        const mePayload = await meResponse.json().catch(() => ({}));
        const registeredCompanyName = mePayload?.company?.name as string | undefined;
        if (registeredCompanyName && registeredCompanyName.trim()) {
          setCompany((prev) => ({
            ...prev,
            name: prev.name && prev.name.trim() ? prev.name : registeredCompanyName.trim(),
          }));
        }

        const enabledModules = (Array.isArray(mePayload?.enabledModules)
          ? mePayload.enabledModules
          : DEFAULT_ENABLED_SLUGS) as ModuleSlug[];
        const cap = (Array.isArray(mePayload?.moduleCap)
          ? mePayload.moduleCap
          : enabledModules) as ModuleSlug[];
        setModuleCapSlugs(cap);
        const steps = filterOnboardingSteps(
          enabledModules.length > 0 ? enabledModules : [...DEFAULT_ENABLED_SLUGS]
        );
        const resolvedSteps = steps.length > 0 ? steps : [1, 2, 3, 4, 5, 13];
        setVisibleSteps(resolvedSteps);
        setStep((prev) => (resolvedSteps.includes(prev) ? prev : resolvedSteps[0]));

      } catch (defaultsError) {
        setError(mapFetchErrorMessage(defaultsError, 'Could not load personalized defaults. You can still continue manually.'));
      } finally {
        setLoadingDefaults(false);
      }
    };

    void loadDefaults();
  }, [applyLocalProgressDraft, applyStepPayload]);

  React.useEffect(() => {
    const draft: LocalOnboardingProgressDraft = {
      savedAt: new Date().toISOString(),
      step,
      completedSteps: Array.from(completedSteps),
      skippedSteps: Array.from(skippedSteps),
      company,
      roles,
      peopleOpsOwnerRole,
      leaveTypes,
      roleQuotas,
      attendance,
      holidays,
      ai,
      payroll,
      notifications,
      constraints,
    };

    window.localStorage.setItem(ONBOARDING_PROGRESS_STORAGE_KEY, JSON.stringify(draft));
  }, [
    step,
    completedSteps,
    skippedSteps,
    company,
    roles,
    peopleOpsOwnerRole,
    leaveTypes,
    roleQuotas,
    attendance,
    holidays,
    ai,
    payroll,
    notifications,
    constraints,
  ]);

  const roleModel = React.useMemo(() => {
    const slugs = new Set(roles.map((role) => role.slug));
    if (slugs.has('director') || slugs.has('team_lead')) return 'full_hierarchy';
    if (slugs.has('manager')) return 'hr_manager_employee';
    return 'hr_employee';
  }, [roles]);

  const ownerRoleOptions = React.useMemo(() => {
    const options = Array.from(
      new Set(
        roles
          .map((role) => role.slug.trim().toLowerCase())
          .filter((slug): slug is OwnerRoleSlug =>
            ['admin', 'hr', 'director', 'manager', 'team_lead', 'employee'].includes(slug)
          )
      )
    );

    if (options.length === 0) {
      return ['admin'] as OwnerRoleSlug[];
    }

    return options;
  }, [roles]);

  React.useEffect(() => {
    setPeopleOpsOwnerRole((current) => {
      if (ownerRoleOptions.includes(current)) {
        return current;
      }

      if (ownerRoleOptions.includes('hr')) {
        return 'hr';
      }

      return ownerRoleOptions[0];
    });
  }, [ownerRoleOptions]);

  const enabledLeaveTypes = React.useMemo(() => leaveTypes.filter((leaveType) => leaveType.enabled), [leaveTypes]);

  const buildStepPayload = React.useCallback((currentStep: number) => {
    switch (currentStep) {
      case 1:
        return {
          companyName: company.name,
          industry: company.industry,
          employeeCount: company.size,
          timezone: company.timezone,
          slaHours: company.slaHours,
          negativeBal: company.negativeBalance,
          probationDays: company.probationDays,
          workStart: company.workStart,
          workEnd: company.workEnd,
          gracePeriodMinutes: company.gracePeriodMinutes,
          halfDayHours: company.halfDayHours,
        };
      case 2:
        return { orgStructure };
      case 3:
        return { approvalChains };
      case 4:
        return { enabledModules: modules.filter((m) => m.isEnabled).map((m) => m.slug) };
      case 5:
        return {
          roles,
          capabilityOwners: {
            peopleOperationsOwner: peopleOpsOwnerRole,
          },
        };
      case 6:
        return { leaveTypes };
      case 7:
        return { roleQuotas };
      case 8:
        return attendance;
      case 9:
        return { holidays };
      case 10:
        return ai;
      case 11:
        return payroll;
      case 12:
        return notifications;
      case 13:
        return { completed: true };
      default:
        return {};
    }
  }, [company, roles, orgStructure, approvalChains, modules, enabledLeaveTypes, roleQuotas, attendance, holidays, ai, payroll, notifications, peopleOpsOwnerRole]);

  const getSkipPayload = React.useCallback((currentStep: number) => {
    // Step 1: Company Basics — must send at least a placeholder so the API doesn't reject.
    if (currentStep === 1) {
      return {
        companyName: company.name.trim() || 'My Company',
        industry: company.industry || 'Technology',
        employeeCount: company.size || '1-50',
        timezone: company.timezone || 'Asia/Kolkata',
        slaHours: company.slaHours,
        negativeBal: company.negativeBalance,
        probationDays: company.probationDays,
        workStart: company.workStart,
        workEnd: company.workEnd,
        gracePeriodMinutes: company.gracePeriodMinutes,
        halfDayHours: company.halfDayHours,
      };
    }
    // Step 2: Org Structure — default to empty org (can configure from Admin later)
    if (currentStep === 2) {
      return { orgStructure: { departments: [], locations: [], costCenters: [], orgModel: 'two_tier' } };
    }
    // Step 3: Approval Mapping — seed sensible role defaults
    if (currentStep === 3) {
      return {
        approvalChains: [
          { workflowType: 'leave', level1Role: 'manager', level2Role: 'hr', autoApproveAfterHours: 48 },
          { workflowType: 'expense', level1Role: 'manager', level2Role: 'admin', autoApproveAfterHours: 0 },
        ],
      };
    }
    // Step 4: Module Enablement — enable core modules only
    if (currentStep === 4) {
      return { enabledModules: ['leave', 'attendance', 'payroll', 'documents'] };
    }
    // Step 5: Roles — seed default role hierarchy
    if (currentStep === 5) {
      return {
        roles: [
          { name: 'Admin', slug: 'admin', authority_level: 1 },
          { name: 'HR', slug: 'hr', authority_level: 2 },
          { name: 'Manager', slug: 'manager', authority_level: 3 },
          { name: 'Employee', slug: 'employee', authority_level: 4 },
        ],
      };
    }
    // Step 6: Leave Types — seed standard types
    if (currentStep === 6) {
      return {
        leaveTypes: [
          { code: 'CL', name: 'Casual Leave', days: 12, carry_forward: false, max_carry_forward: 0, encashment_enabled: false, encashment_max_days: 0, paid: true },
          { code: 'SL', name: 'Sick Leave', days: 7, carry_forward: false, max_carry_forward: 0, encashment_enabled: false, encashment_max_days: 0, paid: true },
          { code: 'EL', name: 'Earned Leave', days: 15, carry_forward: true, max_carry_forward: 30, encashment_enabled: false, encashment_max_days: 0, paid: true },
        ],
      };
    }
    // Step 13: Finalize
    if (currentStep === 13) {
      return { completed: true };
    }
    return buildStepPayload(currentStep);
  }, [buildStepPayload, company]);

  const saveStep = React.useCallback(async (currentStep: number, payload: unknown) => {
    const response = await fetchWithTimeout(`/api/onboarding/step/${currentStep}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    }, REQUEST_TIMEOUT_MS);

    if (!response.ok) {
      const payload = await response
        .json()
        .catch(() => ({} as { error?: string; details?: { fieldErrors?: Record<string, string[] | undefined> } }));

      const detailErrors = payload.details?.fieldErrors
        ? Object.entries(payload.details.fieldErrors)
            .flatMap(([field, messages]) =>
              Array.isArray(messages)
                ? messages
                    .filter((message): message is string => typeof message === 'string' && message.trim().length > 0)
                    .map((message) => `${field}: ${message.trim()}`)
                : []
            )
        : [];

      const detailMessage = detailErrors.length > 0 ? ` (${detailErrors.join(' | ')})` : '';
      throw new Error(payload.error ? `${payload.error}${detailMessage}` : `Failed to save step ${currentStep}${detailMessage}`);
    }
  }, []);

  const handleContinue = async () => {
    setSaving(true);
    setError('');
    try {
      writeOnboardingDraft({
        company: {
          name: company.name,
          industry: company.industry,
          size: company.size,
          timezone: company.timezone,
          workStart: company.workStart,
          workEnd: company.workEnd,
          gracePeriodMinutes: company.gracePeriodMinutes,
          halfDayHours: company.halfDayHours,
        },
      });

      await saveStep(step, buildStepPayload(step));
      setCompletedSteps((prev) => new Set(prev).add(step));
      setStep((prev) => nextVisibleStep(prev, visibleSteps));
    } catch (saveError) {
      setError(mapFetchErrorMessage(saveError, 'Unable to save current step.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    setError('');
    try {
      await saveStep(step, getSkipPayload(step));
      setCompletedSteps((prev) => new Set(prev).add(step));
      setSkippedSteps((prev) => new Set(prev).add(step));
      setStep((prev) => nextVisibleStep(prev, visibleSteps));
    } catch (saveError) {
      setError(mapFetchErrorMessage(saveError, 'Unable to skip this step.'));
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    setSaving(true);
    setError('');
    try {
      const completePayload = {
        company: {
          name: company.name.trim() || 'My Company',
          industry: company.industry || 'Technology',
          size: company.size || '1-50',
          timezone: company.timezone || 'Asia/Kolkata',
          sla_hours: company.slaHours,
          negative_balance: company.negativeBalance,
          probation_period_days: company.probationDays,
          work_days: attendance.workingDays,
        },
        role_model: roleModel,
        role_setup: {
          roles: roles.map((role) => ({
            ...role,
            base_role: role.slug,
            color: 'var(--primary)',
            description: `${role.name} role configured during onboarding`,
          })),
        },
        role_quotas: roleQuotas,
        capability_owners: {
          people_operations: peopleOpsOwnerRole,
        },
        leave_types: enabledLeaveTypes.map((leaveType) => ({
          code: leaveType.code,
          name: leaveType.name,
          days: leaveType.days,
          carry_forward: leaveType.carry_forward,
          max_carry_forward: leaveType.max_carry_forward,
          encashment_enabled: leaveType.encashment_enabled,
          encashment_max_days: leaveType.encashment_max_days,
          paid: leaveType.paid,
        })),
        holidays,
        notifications: {
          email_notifications: notifications.emailNotifications,
          manager_alerts: notifications.managerAlerts,
          daily_digest: notifications.dailyDigest,
          sla_alerts: notifications.slaAlerts,
        },
        constraint_config: {
          min_coverage_percent: constraints.minCoveragePercent,
          max_concurrent: constraints.maxConcurrent,
          blackout_dates: [],
          auto_approve: ai.enabled,
          auto_approve_threshold: ai.confidenceThreshold,
        },
        attendance,
        ai,
        payroll,
        work_start: company.workStart,
        work_end: company.workEnd,
        grace_period_minutes: company.gracePeriodMinutes,
        half_day_hours: company.halfDayHours,
        // New Zoho-parity fields
        org_structure: orgStructure,
        approval_chains: approvalChains,
        enabled_modules: modules.filter((m) => m.isEnabled).map((m) => m.slug),
      };

      const response = await fetchWithTimeout('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(completePayload),
      }, FINALIZE_REQUEST_TIMEOUT_MS);

      if (!response.ok) {
        const payload = await response.json().catch(() => ({} as { error?: string }));
        throw new Error(payload.error || 'Unable to finalize onboarding.');
      }

      const meResponse = await fetchWithTimeout('/api/auth/me', { credentials: 'include' }, REQUEST_TIMEOUT_MS);
      if (!meResponse.ok) {
        router.replace('/employee/dashboard');
        return;
      }

      const me = (await meResponse.json()) as {
        primary_role?: string | null;
        secondary_roles?: string[] | null;
        employee_onboarding_completed?: boolean;
        employee_welcome_pending?: boolean;
      };

      const role = (me.primary_role || '').toLowerCase();
      if (role && role !== 'admin' && role !== 'super_admin') {
        if (me.employee_onboarding_completed === false) {
          router.replace('/employee/onboarding');
          return;
        }
        if (me.employee_welcome_pending === true) {
          router.replace('/employee/welcome');
          return;
        }
      }

      window.localStorage.removeItem(ONBOARDING_PROGRESS_STORAGE_KEY);
      router.replace(getDefaultPortalForRoles(me.primary_role, me.secondary_roles) || getDefaultPortalForRole(me.primary_role));
    } catch (finalizeError) {
      setError(mapFetchErrorMessage(finalizeError, 'Onboarding completion failed.'));
    } finally {
      setSaving(false);
    }
  };

  const updateRole = (index: number, patch: Partial<RoleDraft>) => {
    setRoles((prev) => prev.map((role, roleIndex) => (roleIndex === index ? { ...role, ...patch } : role)));
  };

  const renderStep = () => {
    if (step === 1) {
      return (
        <div className="space-y-4">
          <Input
            className="input h-12"
            label="Company Name"
            placeholder="Acme Technologies"
            value={company.name}
            onChange={(e) => setCompany((prev) => ({ ...prev, name: e.target.value }))}
          />
          <Input
            className="input h-12"
            label="Industry"
            placeholder="Technology, Healthcare, Manufacturing..."
            value={company.industry}
            onChange={(e) => setCompany((prev) => ({ ...prev, industry: e.target.value }))}
          />
          <Select className="input h-12" label="Company Size" value={company.size} onChange={(e) => setCompany((prev) => ({ ...prev, size: e.target.value }))}>
            <option value="1-50">1-50</option><option value="51-200">51-200</option><option value="201-1000">201-1000</option><option value="1000+">1000+</option>
          </Select>
          <Select className="input h-12" label="Primary Timezone" helperText="Used for attendance, leave dates, and payroll cutoffs." value={company.timezone} onChange={(e) => setCompany((prev) => ({ ...prev, timezone: e.target.value }))}>
            <option value="Asia/Kolkata">Asia/Kolkata</option><option value="America/New_York">America/New_York</option><option value="Europe/Berlin">Europe/Berlin</option>
          </Select>
        </div>
      );
    }

    // ─── Step 2: Org Structure (NEW) ───────────────────────────────────────
    if (step === 2) {
      return (
        <OrgStructureStep
          value={orgStructure}
          onChange={setOrgStructure}
        />
      );
    }

    // ─── Step 3: Approval Mapping (NEW) ────────────────────────────────────
    if (step === 3) {
      return (
        <ApprovalMappingStep
          value={approvalChains}
          onChange={setApprovalChains}
          availableRoleSlugs={roles.map((r) => r.slug)}
        />
      );
    }

    // ─── Step 4: Module Enablement (NEW) ───────────────────────────────────
    if (step === 4) {
      return (
        <ModuleEnablementStep
          value={modules}
          onChange={setModules}
        />
      );
    }

    if (step === 5) {
      return (
        <div className="space-y-3">
          {roles.map((role, index) => (
            <div key={`${role.slug}-${index}`} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <Input className="input h-11" label={index === 0 ? 'Role Name' : undefined} value={role.name} onChange={(e) => updateRole(index, { name: e.target.value })} />
              <Input className="input h-11" label={index === 0 ? 'Role Slug' : undefined} helperText={index === 0 ? 'Used for permissions mapping. Lowercase + underscore.' : undefined} value={role.slug} onChange={(e) => updateRole(index, { slug: e.target.value.toLowerCase().replace(/\s+/g, '_') })} />
              <Input className="input h-11" label={index === 0 ? 'Authority Level' : undefined} helperText={index === 0 ? 'Lower number = higher authority.' : undefined} type="number" min={1} max={20} value={role.authority_level} onChange={(e) => updateRole(index, { authority_level: Number(e.target.value) })} />
              <Checkbox
                id={`role-can-create-users-${index}`}
                checked={role.can_create_users}
                onChange={(e) => updateRole(index, { can_create_users: e.target.checked })}
                label="Can Create Users"
              />
            </div>
          ))}

          <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-3">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              People Operations Owner Role
            </label>
            <Select
              className="input h-11"
              value={peopleOpsOwnerRole}
              onChange={(e) => setPeopleOpsOwnerRole(e.target.value as OwnerRoleSlug)}
              title="People Operations Owner Role"
            >
              {ownerRoleOptions.map((role) => (
                <option key={role} value={role}>
                  {role.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}
                </option>
              ))}
            </Select>
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              If HR is unavailable in this company, People Operations responsibilities route to this owner role.
            </p>
          </div>
        </div>
      );
    }

    if (step === 6) {
      return (
        <div className="space-y-3 max-h-[340px] overflow-auto pr-1">
          {leaveTypes.map((leaveType, index) => (
            <div key={leaveType.code} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
              <Checkbox
                id={`leave-type-enabled-${index}`}
                checked={leaveType.enabled}
                onChange={(e) => setLeaveTypes((prev) => prev.map((lt, i) => (i === index ? { ...lt, enabled: e.target.checked } : lt)))}
                label={leaveType.code}
                description={index === 0 ? 'Toggle leave type availability for employees.' : undefined}
              />
              <Input className="input h-10 sm:col-span-2" label={index === 0 ? 'Leave Name' : undefined} value={leaveType.name} onChange={(e) => setLeaveTypes((prev) => prev.map((lt, i) => (i === index ? { ...lt, name: e.target.value } : lt)))} />
              <Input className="input h-10" label={index === 0 ? 'Annual Days' : undefined} type="number" min={0} max={365} value={leaveType.days} onChange={(e) => setLeaveTypes((prev) => prev.map((lt, i) => (i === index ? { ...lt, days: Number(e.target.value) } : lt)))} />
            </div>
          ))}
        </div>
      );
    }

    if (step === 7) {
      return (
        <div className="space-y-3">
          <p className="text-sm text-[var(--muted-foreground)]">Optional: customize role-wise leave quotas now, or skip and adjust later in settings.</p>
          <Button
            type="button"
            className="btn btn-secondary"
            onClick={() => setRoleQuotas((prev) => [...prev, { role_slug: 'employee', leave_type_code: 'CL', annual_quota: 12 }])}
          >
            Add quota rule
          </Button>
          {roleQuotas.map((quota, idx) => (
            <div key={`${quota.role_slug}-${quota.leave_type_code}-${idx}`} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
              <Input className="input h-10 sm:col-span-3" label={idx === 0 ? 'Role Slug' : undefined} value={quota.role_slug} onChange={(e) => setRoleQuotas((prev) => prev.map((q, i) => (i === idx ? { ...q, role_slug: e.target.value } : q)))} />
              <Input className="input h-10 sm:col-span-3" label={idx === 0 ? 'Leave Code' : undefined} value={quota.leave_type_code} onChange={(e) => setRoleQuotas((prev) => prev.map((q, i) => (i === idx ? { ...q, leave_type_code: e.target.value } : q)))} />
              <Input className="input h-10 sm:col-span-4" label={idx === 0 ? 'Annual Quota' : undefined} type="number" min={0} max={365} value={quota.annual_quota} onChange={(e) => setRoleQuotas((prev) => prev.map((q, i) => (i === idx ? { ...q, annual_quota: Number(e.target.value) } : q)))} />
              <Button
                type="button"
                title="Remove quota rule"
                aria-label="Remove quota rule"
                className="btn btn-secondary sm:col-span-2 h-10"
                onClick={() => setRoleQuotas((prev) => prev.filter((_, i) => i !== idx))}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      );
    }

    if (step === 8) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input className="input h-11" label="Check-in Start" helperText="Earliest allowed check-in time." type="time" value={attendance.checkInWindowStart} onChange={(e) => setAttendance((prev) => ({ ...prev, checkInWindowStart: e.target.value }))} />
          <Input className="input h-11" label="Check-in End" helperText="Latest allowed check-in time." type="time" value={attendance.checkInWindowEnd} onChange={(e) => setAttendance((prev) => ({ ...prev, checkInWindowEnd: e.target.value }))} />
          <Input className="input h-11" label="Check-out Start" type="time" value={attendance.checkOutWindowStart} onChange={(e) => setAttendance((prev) => ({ ...prev, checkOutWindowStart: e.target.value }))} />
          <Input className="input h-11" label="Check-out End" type="time" value={attendance.checkOutWindowEnd} onChange={(e) => setAttendance((prev) => ({ ...prev, checkOutWindowEnd: e.target.value }))} />
          <Input className="input h-11" label="Grace Period (minutes)" helperText="Late minutes allowed before marking late." type="number" min={0} max={120} value={attendance.gracePeriodMinutes} onChange={(e) => setAttendance((prev) => ({ ...prev, gracePeriodMinutes: Number(e.target.value) }))} />
          <Checkbox
            id="attendance-wfh-allowed"
            checked={attendance.wfhAllowed}
            onChange={(e) => setAttendance((prev) => ({ ...prev, wfhAllowed: e.target.checked }))}
            label="WFH Allowed"
            description="Allow approved work-from-home attendance records."
          />
        </div>
      );
    }

    if (step === 9) {
      return (
        <div className="space-y-3">
          <Button type="button" className="btn btn-secondary" onClick={() => setHolidays((prev) => [...prev, { name: '', date: '' }])}>Add holiday</Button>
          {holidays.map((holiday, index) => (
            <div key={`holiday-${index}`} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
              <Input className="input h-10 sm:col-span-5" label={index === 0 ? 'Holiday Name' : undefined} placeholder="Republic Day" value={holiday.name} onChange={(e) => setHolidays((prev) => prev.map((item, i) => (i === index ? { ...item, name: e.target.value } : item)))} />
              <Input className="input h-10 sm:col-span-5" label={index === 0 ? 'Holiday Date' : undefined} type="date" value={holiday.date} onChange={(e) => setHolidays((prev) => prev.map((item, i) => (i === index ? { ...item, date: e.target.value } : item)))} />
              <Button
                type="button"
                title="Remove holiday"
                aria-label="Remove holiday"
                className="btn btn-secondary sm:col-span-2 h-10"
                onClick={() => setHolidays((prev) => prev.filter((_, i) => i !== index))}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      );
    }

    if (step === 10) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Checkbox
            id="ai-enabled"
            checked={ai.enabled}
            onChange={(e) => setAi((prev) => ({ ...prev, enabled: e.target.checked }))}
            label="Enable AI recommendations"
            description="Use AI to suggest leave decisions and escalation hints."
          />
          <div className="space-y-2">
            <Input className="input h-11" label="Confidence Threshold" helperText="0-1 score required before AI can auto-approve." type="number" step="0.05" min={0} max={1} value={ai.confidenceThreshold} onChange={(e) => setAi((prev) => ({ ...prev, confidenceThreshold: Number(e.target.value) }))} />
            <InfoHint
              title="How Confidence Threshold works"
              examples={[
                '0.8: AI auto-approves only when confidence is 80% or higher.',
                '1.0: Only near-perfect confidence gets auto-approved (very strict).',
                '0.0: Almost everything may auto-approve (very permissive).',
                'Null/empty from external data: system falls back to a safe default threshold during finalization.',
              ]}
            />
          </div>
          <div className="space-y-2">
            <Input className="input h-11" label="Auto-Approve Max Days" helperText="Maximum leave days allowed for auto-approval." type="number" min={0} max={30} value={ai.autoApproveMaxDays} onChange={(e) => setAi((prev) => ({ ...prev, autoApproveMaxDays: Number(e.target.value) }))} />
            <InfoHint
              title="How Max Days works"
              examples={[
                '3: requests up to 3 days can be auto-approved if confidence/coverage pass.',
                '0: no leave request qualifies for auto-approval by duration rule.',
                '30: long requests can be considered, but confidence and coverage still apply.',
              ]}
            />
          </div>
          <div className="space-y-2">
            <Input className="input h-11" label="Minimum Team Coverage (%)" helperText="Auto-approval allowed only when this team coverage remains." type="number" min={0} max={100} value={ai.minTeamCoverage} onChange={(e) => setAi((prev) => ({ ...prev, minTeamCoverage: Number(e.target.value) }))} />
            <InfoHint
              title="How Team Coverage works"
              examples={[
                '50: auto-approval only if at least half the team remains available.',
                '100: auto-approval only when everyone else is still available (very strict).',
                '0: coverage rule does not restrict auto-approval.',
              ]}
            />
          </div>
        </div>
      );
    }

    if (step === 11) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Checkbox
            id="payroll-pf-enabled"
            checked={payroll.pfEnabled}
            onChange={(e) => setPayroll((prev) => ({ ...prev, pfEnabled: e.target.checked }))}
            label="PF Enabled"
            description="Provident Fund deduction and employer contribution."
          />
          <Input className="input h-11" label="PF Ceiling Amount" helperText="Max monthly salary amount eligible for PF calculation." type="number" value={payroll.pfCeiling} onChange={(e) => setPayroll((prev) => ({ ...prev, pfCeiling: Number(e.target.value) }))} />
          <Checkbox
            id="payroll-esi-enabled"
            checked={payroll.esiEnabled}
            onChange={(e) => setPayroll((prev) => ({ ...prev, esiEnabled: e.target.checked }))}
            label="ESI Enabled"
            description="Employee State Insurance eligibility and deductions."
          />
          <Input className="input h-11" label="Salary Pay Day" helperText="Day of month when salary is processed." type="number" value={payroll.salaryPayDay} onChange={(e) => setPayroll((prev) => ({ ...prev, salaryPayDay: Number(e.target.value) }))} />
        </div>
      );
    }

    if (step === 12) {
      return (
        <div className="space-y-2">
          <Checkbox
            id="notifications-email"
            checked={notifications.emailNotifications}
            onChange={(e) => setNotifications((prev) => ({ ...prev, emailNotifications: e.target.checked }))}
            label="Email notifications"
          />
          <Checkbox
            id="notifications-manager-alerts"
            checked={notifications.managerAlerts}
            onChange={(e) => setNotifications((prev) => ({ ...prev, managerAlerts: e.target.checked }))}
            label="Manager alerts"
          />
          <Checkbox
            id="notifications-daily-digest"
            checked={notifications.dailyDigest}
            onChange={(e) => setNotifications((prev) => ({ ...prev, dailyDigest: e.target.checked }))}
            label="Daily digest"
          />
          <Checkbox
            id="notifications-sla-alerts"
            checked={notifications.slaAlerts}
            onChange={(e) => setNotifications((prev) => ({ ...prev, slaAlerts: e.target.checked }))}
            label="SLA alerts"
          />
        </div>
      );
    }

    return (
      <div className="space-y-3 text-sm text-[var(--muted-foreground)]">
        <p>Review complete. Click finalize to save company personalization:</p>
        <p>Leave types configured: {enabledLeaveTypes.length}</p>
        <p>Roles configured: {roles.length}</p>
        <p>Skipped steps: {Array.from(skippedSteps).sort((a, b) => a - b).join(', ') || 'none'}</p>
        <div className="grid grid-cols-2 gap-3">
          <Input className="input h-10" label="Minimum Coverage (%)" helperText="Minimum team coverage to maintain during leave." type="number" min={0} max={100} value={constraints.minCoveragePercent} onChange={(e) => setConstraints((prev) => ({ ...prev, minCoveragePercent: Number(e.target.value) }))} />
          <Input className="input h-10" label="Max Concurrent Leaves" helperText="Maximum overlapping leaves allowed." type="number" min={1} max={50} value={constraints.maxConcurrent} onChange={(e) => setConstraints((prev) => ({ ...prev, maxConcurrent: Number(e.target.value) }))} />
        </div>
      </div>
    );
  };

  if (loadingDefaults) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="card p-8 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--primary)]" />
          <span>Loading personalized onboarding defaults...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="card p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)] font-semibold">Company Admin Onboarding</p>
              <h1 className="text-h2 mt-1">
                Step {visibleSteps.indexOf(step) + 1} of {visibleSteps.length}: {STEP_TITLES[step - 1]}
              </h1>
              <p className="text-sm text-[var(--muted-foreground)] mt-2">{STEP_GUIDANCE[step - 1]}</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">Every step can be skipped now and edited later from settings.</p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-[var(--border)] bg-[var(--card)] text-xs">
              <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
              Completed: {completedSteps.size}/{visibleSteps.length}
            </div>
          </div>

          <div className="mt-4 h-2 rounded-full bg-[var(--muted)] overflow-hidden">
            <div className="h-full bg-[var(--primary)]" style={{
                width: `${((visibleSteps.indexOf(step) + 1) / Math.max(visibleSteps.length, 1)) * 100}%`,
              }} />
          </div>
        </div>

        <div className="card p-6 sm:p-8 space-y-6">
          {renderStep()}

          {error && (
            <div className="rounded-lg border border-[var(--destructive)]/40 bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border)]">
            <Button
              type="button"
              className="btn btn-secondary"
              onClick={() => setStep((prev) => prevVisibleStep(prev, visibleSteps))}
              disabled={saving || step === visibleSteps[0]}
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <div className="flex items-center gap-2">
              {step < (visibleSteps[visibleSteps.length - 1] ?? TOTAL_STEPS) && (
                <Button type="button" className="btn btn-secondary" onClick={handleSkip} disabled={saving}>
                  <SkipForward className="w-4 h-4" /> Skip Step
                </Button>
              )}
              {step < (visibleSteps[visibleSteps.length - 1] ?? TOTAL_STEPS) ? (
                <Button type="button" className="btn btn-primary" onClick={handleContinue} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Save & Continue <ArrowRight className="w-4 h-4" /></>}
                </Button>
              ) : (
                <Button type="button" className="btn btn-primary" onClick={handleFinalize} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Finalize Onboarding'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

