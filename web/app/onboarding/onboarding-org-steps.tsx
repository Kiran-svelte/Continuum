/**
 * onboarding-org-steps.tsx
 *
 * Zoho-style onboarding steps for:
 *   - Step 2: Org Structure (departments, locations, cost centers, org model)
 *   - Step 3: Approval Chain Mapping (who approves leave/expenses per workflow)
 *   - Step 4: Module Enablement (which HR modules are active for this tenant)
 *
 * These are new steps inserted between the existing Step 1 (Company Basics)
 * and the former Step 2 (Roles), which becomes Step 5 after insertion.
 *
 * Data is collected during onboarding and persisted via the existing
 * /api/onboarding/step/:stepNumber endpoint. The finalize payload
 * includes org_structure and approval_chains for backend seeding.
 *
 * @module app/onboarding/onboarding-org-steps
 */

'use client';

import React from 'react';
import { Plus, Trash2, Building2, MapPin, DollarSign, GitBranch, CheckSquare, Square } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Department {
  id: string;
  name: string;
  code: string;
  /** Role slug of the department head (e.g. 'manager', 'hr') */
  headRole: string;
}

export interface OrgLocation {
  id: string;
  name: string;
  city: string;
  country: string;
}

export interface CostCenter {
  id: string;
  name: string;
  code: string;
}

export type OrgModel = 'flat' | 'two_tier' | 'full_hierarchy';

export interface OrgStructure {
  departments: Department[];
  locations: OrgLocation[];
  costCenters: CostCenter[];
  orgModel: OrgModel;
}

export type WorkflowType = 'leave' | 'expense' | 'payroll_advance' | 'travel';

export interface ApprovalChain {
  workflowType: WorkflowType;
  /** Primary approver role slug */
  level1Role: string;
  /** Secondary approver role slug (escalation) */
  level2Role: string;
  /** Auto-approve if pending beyond this many hours (0 = no auto-approve) */
  autoApproveAfterHours: number;
}

export interface ModuleConfig {
  slug: string;
  label: string;
  description: string;
  icon: string;
  isEnabled: boolean;
  isMandatory: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

import {
  CORE_FUNCTION_CATALOG,
  DEFAULT_ENABLED_SLUGS,
  MANDATORY_SLUGS,
  MODULE_PICKER_META,
  type ModuleSlug,
} from '@/lib/core-functions/catalog';

/** All available modules with their defaults and mandatory flags. */
export const DEFAULT_MODULES: ModuleConfig[] = CORE_FUNCTION_CATALOG.filter(
  (cf) => cf.slug !== 'employees'
).map((cf) => {
  const meta = MODULE_PICKER_META[cf.slug as ModuleSlug];
  return {
    slug: cf.slug,
    label: meta?.label ?? cf.name,
    description: meta?.description ?? cf.description,
    icon: meta?.icon ?? '⚙️',
    isEnabled: DEFAULT_ENABLED_SLUGS.includes(cf.slug as ModuleSlug),
    isMandatory: MANDATORY_SLUGS.includes(cf.slug as ModuleSlug),
  };
});

const ORG_MODELS: Array<{ value: OrgModel; label: string; description: string }> = [
  { value: 'flat', label: 'Flat', description: 'All employees report directly to admin/HR. Best for teams under 15.' },
  { value: 'two_tier', label: 'Manager → Employee', description: 'Managers are the primary approvers for their direct reports.' },
  { value: 'full_hierarchy', label: 'Full Hierarchy', description: 'Multiple tiers: Director → Manager → Team Lead → Employee.' },
];

const WORKFLOW_LABELS: Record<WorkflowType, string> = {
  leave: 'Leave Requests',
  expense: 'Expense Claims',
  payroll_advance: 'Payroll Advances',
  travel: 'Travel Requests',
};

const DEFAULT_APPROVAL_CHAINS: ApprovalChain[] = [
  { workflowType: 'leave', level1Role: 'manager', level2Role: 'hr', autoApproveAfterHours: 48 },
  { workflowType: 'expense', level1Role: 'manager', level2Role: 'admin', autoApproveAfterHours: 0 },
  { workflowType: 'payroll_advance', level1Role: 'hr', level2Role: 'admin', autoApproveAfterHours: 0 },
  { workflowType: 'travel', level1Role: 'manager', level2Role: 'admin', autoApproveAfterHours: 0 },
];

// ─── Step 2: Org Structure ────────────────────────────────────────────────────

/**
 * Renders the Org Structure onboarding step.
 * Collects departments, locations, cost centers, and org model.
 */
export function OrgStructureStep({
  value,
  onChange,
}: {
  value: OrgStructure;
  onChange: (next: OrgStructure) => void;
}) {
  const addDepartment = () =>
    onChange({
      ...value,
      departments: [
        ...value.departments,
        { id: crypto.randomUUID(), name: '', code: '', headRole: 'manager' },
      ],
    });

  const removeDepartment = (id: string) =>
    onChange({ ...value, departments: value.departments.filter((d) => d.id !== id) });

  const patchDepartment = (id: string, patch: Partial<Department>) =>
    onChange({
      ...value,
      departments: value.departments.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    });

  const addLocation = () =>
    onChange({
      ...value,
      locations: [
        ...value.locations,
        { id: crypto.randomUUID(), name: '', city: '', country: 'India' },
      ],
    });

  const removeLocation = (id: string) =>
    onChange({ ...value, locations: value.locations.filter((l) => l.id !== id) });

  const patchLocation = (id: string, patch: Partial<OrgLocation>) =>
    onChange({
      ...value,
      locations: value.locations.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    });

  const addCostCenter = () =>
    onChange({
      ...value,
      costCenters: [
        ...value.costCenters,
        { id: crypto.randomUUID(), name: '', code: '' },
      ],
    });

  const removeCostCenter = (id: string) =>
    onChange({ ...value, costCenters: value.costCenters.filter((c) => c.id !== id) });

  const patchCostCenter = (id: string, patch: Partial<CostCenter>) =>
    onChange({
      ...value,
      costCenters: value.costCenters.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });

  return (
    <div className="space-y-6">
      {/* Org Model */}
      <section>
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
          <GitBranch className="w-3.5 h-3.5 inline mr-1.5" aria-hidden="true" />
          Organization Model
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ORG_MODELS.map((model) => (
            <button
              key={model.value}
              type="button"
              id={`org-model-${model.value}`}
              aria-pressed={value.orgModel === model.value}
              onClick={() => onChange({ ...value, orgModel: model.value })}
              className={`p-3 rounded-xl border text-left transition-all duration-150 ${
                value.orgModel === model.value
                  ? 'border-[var(--primary)] bg-[var(--primary)]/8 text-[var(--primary)]'
                  : 'border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--primary)]/50'
              }`}
            >
              <div className="font-semibold text-sm mb-0.5">{model.label}</div>
              <div className="text-xs text-[var(--muted-foreground)] leading-relaxed">{model.description}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Departments */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
            <Building2 className="w-3.5 h-3.5 inline mr-1.5" aria-hidden="true" />
            Departments
          </label>
          <button type="button" onClick={addDepartment} className="btn btn-secondary text-xs flex items-center gap-1 px-2 py-1">
            <Plus className="w-3 h-3" aria-hidden="true" /> Add
          </button>
        </div>
        <div className="space-y-2">
          {value.departments.length === 0 && (
            <p className="text-xs text-[var(--muted-foreground)] py-2 text-center">
              No departments yet — add your first one above. You can always add more from Admin → People later.
            </p>
          )}
          {value.departments.map((dept, i) => (
            <div key={dept.id} className="grid grid-cols-12 gap-2 items-center">
              <input
                id={`dept-name-${i}`}
                className="input h-10 col-span-4"
                placeholder="e.g. Engineering"
                value={dept.name}
                aria-label="Department name"
                onChange={(e) => patchDepartment(dept.id, { name: e.target.value })}
              />
              <input
                id={`dept-code-${i}`}
                className="input h-10 col-span-2"
                placeholder="ENG"
                value={dept.code}
                aria-label="Department code"
                maxLength={8}
                onChange={(e) => patchDepartment(dept.id, { code: e.target.value.toUpperCase() })}
              />
              <select
                id={`dept-head-${i}`}
                className="input h-10 col-span-4"
                value={dept.headRole}
                aria-label="Department head role"
                onChange={(e) => patchDepartment(dept.id, { headRole: e.target.value })}
              >
                <option value="admin">Admin</option>
                <option value="hr">HR</option>
                <option value="manager">Manager</option>
                <option value="director">Director</option>
                <option value="team_lead">Team Lead</option>
              </select>
              <button
                type="button"
                onClick={() => removeDepartment(dept.id)}
                className="col-span-2 flex justify-center text-[var(--muted-foreground)] hover:text-[var(--danger)] transition-colors"
                aria-label={`Remove department ${dept.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {value.departments.length > 0 && (
            <p className="text-[10px] text-[var(--muted-foreground)]">
              Name · Code · Head Role · Remove
            </p>
          )}
        </div>
      </section>

      {/* Locations */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
            <MapPin className="w-3.5 h-3.5 inline mr-1.5" aria-hidden="true" />
            Office Locations <span className="font-normal lowercase">(optional)</span>
          </label>
          <button type="button" onClick={addLocation} className="btn btn-secondary text-xs flex items-center gap-1 px-2 py-1">
            <Plus className="w-3 h-3" aria-hidden="true" /> Add
          </button>
        </div>
        <div className="space-y-2">
          {value.locations.map((loc, i) => (
            <div key={loc.id} className="grid grid-cols-12 gap-2 items-center">
              <input id={`loc-name-${i}`} className="input h-10 col-span-4" placeholder="HQ Mumbai" value={loc.name} aria-label="Location name" onChange={(e) => patchLocation(loc.id, { name: e.target.value })} />
              <input id={`loc-city-${i}`} className="input h-10 col-span-3" placeholder="Mumbai" value={loc.city} aria-label="City" onChange={(e) => patchLocation(loc.id, { city: e.target.value })} />
              <input id={`loc-country-${i}`} className="input h-10 col-span-3" placeholder="India" value={loc.country} aria-label="Country" onChange={(e) => patchLocation(loc.id, { country: e.target.value })} />
              <button type="button" onClick={() => removeLocation(loc.id)} className="col-span-2 flex justify-center text-[var(--muted-foreground)] hover:text-[var(--danger)] transition-colors" aria-label={`Remove location ${loc.name}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Cost Centers */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
            <DollarSign className="w-3.5 h-3.5 inline mr-1.5" aria-hidden="true" />
            Cost Centers <span className="font-normal lowercase">(optional)</span>
          </label>
          <button type="button" onClick={addCostCenter} className="btn btn-secondary text-xs flex items-center gap-1 px-2 py-1">
            <Plus className="w-3 h-3" aria-hidden="true" /> Add
          </button>
        </div>
        <div className="space-y-2">
          {value.costCenters.map((cc, i) => (
            <div key={cc.id} className="grid grid-cols-12 gap-2 items-center">
              <input id={`cc-name-${i}`} className="input h-10 col-span-7" placeholder="Product Development" value={cc.name} aria-label="Cost center name" onChange={(e) => patchCostCenter(cc.id, { name: e.target.value })} />
              <input id={`cc-code-${i}`} className="input h-10 col-span-3" placeholder="CC-001" value={cc.code} aria-label="Cost center code" maxLength={12} onChange={(e) => patchCostCenter(cc.id, { code: e.target.value.toUpperCase() })} />
              <button type="button" onClick={() => removeCostCenter(cc.id)} className="col-span-2 flex justify-center text-[var(--muted-foreground)] hover:text-[var(--danger)] transition-colors" aria-label={`Remove cost center ${cc.name}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Step 3: Approval Chain Mapping ───────────────────────────────────────────

/**
 * Renders the Approval Chain mapping step.
 * For each workflow type, the admin picks Level 1 and Level 2 approver roles
 * and an optional auto-approve timeout.
 */
export function ApprovalMappingStep({
  value,
  onChange,
  availableRoleSlugs,
}: {
  value: ApprovalChain[];
  onChange: (next: ApprovalChain[]) => void;
  availableRoleSlugs: string[];
}) {
  const patchChain = (workflowType: WorkflowType, patch: Partial<ApprovalChain>) => {
    onChange(value.map((chain) => (chain.workflowType === workflowType ? { ...chain, ...patch } : chain)));
  };

  const roleOptions = ['admin', 'hr', 'manager', 'director', 'team_lead', 'employee', ...availableRoleSlugs.filter((s) => !['admin', 'hr', 'manager', 'director', 'team_lead', 'employee'].includes(s))];

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
        Define who approves each workflow type. Level 2 is the escalation approver — used when Level 1 doesn&apos;t
        respond within the SLA or is unavailable.
      </p>
      <div className="space-y-3">
        {value.map((chain) => (
          <div key={chain.workflowType} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="font-semibold text-sm text-[var(--foreground)] mb-3">
              {WORKFLOW_LABELS[chain.workflowType]}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor={`chain-l1-${chain.workflowType}`} className="block text-xs text-[var(--muted-foreground)] mb-1 font-medium">
                  Level 1 Approver
                </label>
                <select
                  id={`chain-l1-${chain.workflowType}`}
                  className="input h-10 w-full"
                  value={chain.level1Role}
                  onChange={(e) => patchChain(chain.workflowType, { level1Role: e.target.value })}
                >
                  {roleOptions.map((slug) => (
                    <option key={slug} value={slug}>
                      {slug.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`chain-l2-${chain.workflowType}`} className="block text-xs text-[var(--muted-foreground)] mb-1 font-medium">
                  Level 2 (Escalation)
                </label>
                <select
                  id={`chain-l2-${chain.workflowType}`}
                  className="input h-10 w-full"
                  value={chain.level2Role}
                  onChange={(e) => patchChain(chain.workflowType, { level2Role: e.target.value })}
                >
                  {roleOptions.map((slug) => (
                    <option key={slug} value={slug}>
                      {slug.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`chain-auto-${chain.workflowType}`} className="block text-xs text-[var(--muted-foreground)] mb-1 font-medium">
                  Auto-approve after (hours)
                </label>
                <input
                  id={`chain-auto-${chain.workflowType}`}
                  type="number"
                  min={0}
                  max={720}
                  className="input h-10 w-full"
                  placeholder="0 = disabled"
                  value={chain.autoApproveAfterHours || ''}
                  onChange={(e) => patchChain(chain.workflowType, { autoApproveAfterHours: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 4: Module Enablement ────────────────────────────────────────────────

/**
 * Renders the module enablement step.
 * Mandatory modules cannot be disabled. Optional modules can be toggled.
 */
export function ModuleEnablementStep({
  value,
  onChange,
}: {
  value: ModuleConfig[];
  onChange: (next: ModuleConfig[]) => void;
}) {
  const toggle = (slug: string) => {
    onChange(value.map((m) => (m.slug === slug && !m.isMandatory ? { ...m, isEnabled: !m.isEnabled } : m)));
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
        Choose which modules to activate for your organization. Mandatory modules (Leave, Attendance) are always on.
        You can change this later from <strong>Admin → Company Settings → Modules</strong>.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {value.map((module) => (
          <button
            key={module.slug}
            type="button"
            id={`module-toggle-${module.slug}`}
            aria-pressed={module.isEnabled}
            disabled={module.isMandatory}
            onClick={() => toggle(module.slug)}
            className={`
              flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-150
              ${module.isEnabled
                ? 'border-[var(--primary)] bg-[var(--primary)]/6'
                : 'border-[var(--border)] bg-[var(--card)]'
              }
              ${module.isMandatory ? 'opacity-80 cursor-default' : 'hover:border-[var(--primary)]/50 cursor-pointer'}
            `}
          >
            <div className="text-xl shrink-0 mt-0.5" aria-hidden="true">{module.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-sm font-semibold ${module.isEnabled ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'}`}>
                  {module.label}
                </span>
                {module.isMandatory && (
                  <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)]">
                    Required
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{module.description}</p>
            </div>
            <div className="shrink-0 mt-0.5">
              {module.isEnabled
                ? <CheckSquare className="w-5 h-5 text-[var(--primary)]" aria-hidden="true" />
                : <Square className="w-5 h-5 text-[var(--muted-foreground)]" aria-hidden="true" />
              }
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Default state factories ──────────────────────────────────────────────────

export function createDefaultOrgStructure(): OrgStructure {
  return { departments: [], locations: [], costCenters: [], orgModel: 'two_tier' };
}

export function createDefaultApprovalChains(): ApprovalChain[] {
  return DEFAULT_APPROVAL_CHAINS.map((chain) => ({ ...chain }));
}

export function createDefaultModules(): ModuleConfig[] {
  return DEFAULT_MODULES.map((module) => ({ ...module }));
}
