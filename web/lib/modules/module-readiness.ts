import {
  CORE_FUNCTION_CATALOG,
  MODULE_SLUGS,
  type ModuleSlug,
} from '@/lib/core-functions/catalog';
import type { CompanyModuleState } from '@/lib/core-functions/types';
import { validateDependencies } from '@/lib/core-functions/validate';
import { getPermissionModuleSlug } from '@/lib/core-functions/permission-module-map';
import { getPortalNavDefinitions, type PortalSlug } from '@/lib/navigation/portal-nav';
import { portalPathModuleGate } from '@/lib/middleware-module-paths';
import { SETUP_HUB_CARDS } from '@/lib/onboarding/setup-hub-catalog';
import { PERMISSION_CATALOG } from '@/lib/rbac';

export type ReadinessStatus = 'pass' | 'warn' | 'fail' | 'off';
export type ReadinessLayerKey =
  | 'catalog'
  | 'company_state'
  | 'session'
  | 'navigation'
  | 'routes'
  | 'apis'
  | 'rbac'
  | 'setup'
  | 'daily_journey';

export interface ModuleReadinessLayer {
  key: ReadinessLayerKey;
  label: string;
  status: ReadinessStatus;
  detail: string;
  href?: string;
}

export interface ModuleReadinessItem {
  slug: ModuleSlug;
  name: string;
  enabled: boolean;
  inCap: boolean;
  rolloutTier: number;
  maturityScore: number;
  maturityLabel: string;
  status: ReadinessStatus;
  score: number;
  summary: string;
  layers: ModuleReadinessLayer[];
}

export interface ModuleReadinessReport {
  generatedAt: string;
  totals: {
    inCap: number;
    enabled: number;
    ready: number;
    warnings: number;
    blocked: number;
  };
  modules: ModuleReadinessItem[];
}

const INFRASTRUCTURE_RBAC_MODULES = new Set<ModuleSlug>([
  'documents',
  'exit',
  'analytics',
]);

const LAYER_LABELS: Record<ReadinessLayerKey, string> = {
  catalog: 'Catalog & dependencies',
  company_state: 'Company state',
  session: 'Session contract',
  navigation: 'Navigation',
  routes: 'Direct routes',
  apis: 'API coverage',
  rbac: 'RBAC',
  setup: 'Setup',
  daily_journey: 'Daily journey',
};

const ROLLOUT_TIER: Record<ModuleSlug, number> = {
  employees: 1,
  leave: 1,
  attendance: 1,
  compliance: 1,
  payroll: 2,
  pf: 2,
  expenses: 3,
  reimbursements: 3,
  documents: 4,
  exit: 4,
  directory: 4,
  performance: 5,
  recruitment: 5,
  learning: 5,
  analytics: 6,
};

const MATURITY_SCORE: Record<ModuleSlug, number> = {
  employees: 5,
  leave: 8,
  compliance: 5,
  pf: 2,
  attendance: 6,
  payroll: 6,
  performance: 2,
  recruitment: 2,
  learning: 1,
  expenses: 4,
  reimbursements: 4,
  directory: 2,
  documents: 4,
  exit: 3,
  analytics: 2,
};

const REQUIRED_DAILY_PORTALS: Record<ModuleSlug, PortalSlug[]> = {
  employees: ['admin', 'hr'],
  leave: ['admin', 'hr', 'manager', 'employee'],
  compliance: ['admin', 'hr'],
  pf: ['hr'],
  attendance: ['hr', 'manager', 'employee'],
  payroll: ['admin', 'hr', 'manager', 'employee'],
  performance: ['hr', 'manager', 'employee'],
  recruitment: ['hr'],
  learning: ['hr', 'employee'],
  expenses: ['hr', 'employee'],
  reimbursements: ['hr', 'manager', 'employee'],
  directory: ['hr', 'manager', 'employee'],
  documents: ['hr', 'employee'],
  exit: ['hr', 'employee'],
  analytics: ['hr', 'manager'],
};

const API_PREFIXES: Record<ModuleSlug, string[]> = {
  employees: ['/api/employees', '/api/hr/employees', '/api/company/invite-user'],
  leave: ['/api/leaves', '/api/company/leave-types', '/api/company/quotas'],
  compliance: ['/api/audit-logs', '/api/compliance/reports'],
  pf: ['/api/compliance/pf-report'],
  attendance: ['/api/attendance', '/api/hr/attendance', '/api/shifts'],
  payroll: ['/api/payroll', '/api/payroll-advances', '/api/salary-components', '/api/salary-structures'],
  performance: ['/api/goals', '/api/review-cycles', '/api/review-instances'],
  recruitment: ['/api/job-postings', '/api/job-applications', '/api/interviews', '/api/offer-letters'],
  learning: ['/api/courses', '/api/course-enrollments'],
  expenses: ['/api/expenses', '/api/travel-requests'],
  reimbursements: ['/api/reimbursements'],
  directory: ['/api/directory', '/api/hr/organization'],
  documents: ['/api/documents', '/api/documents/upload'],
  exit: ['/api/exit-checklist'],
  analytics: ['/api/reports'],
};

function permissionCoverage(slug: ModuleSlug): string[] {
  const tags = new Set<string>();
  for (const permission of PERMISSION_CATALOG) {
    if (getPermissionModuleSlug(permission.module) === slug) {
      tags.add(permission.module);
    }
  }
  return Array.from(tags).sort();
}

function navCoverage(slug: ModuleSlug): PortalSlug[] {
  return (['admin', 'hr', 'manager', 'employee'] as PortalSlug[]).filter((portal) =>
    getPortalNavDefinitions(portal).some(
      (item) =>
        item.moduleSlug === slug ||
        item.requiresAnyModule?.includes(slug) ||
        (slug === 'employees' && item.moduleSlug === 'employees')
    )
  );
}

function routeCoverage(slug: ModuleSlug): string[] {
  const candidates = [
    ...getPortalNavDefinitions('admin').map((item) => item.href),
    ...getPortalNavDefinitions('hr').map((item) => item.href),
    ...getPortalNavDefinitions('manager').map((item) => item.href),
    ...getPortalNavDefinitions('employee').map((item) => item.href),
  ];
  return Array.from(new Set(candidates)).filter((href) => {
    const gate = portalPathModuleGate(href);
    if (gate.kind === 'single') return gate.slug === slug;
    if (gate.kind === 'any') return gate.slugs.includes(slug);
    return slug === 'employees' && href.includes('/people');
  });
}

function setupCoverage(slug: ModuleSlug): string[] {
  return SETUP_HUB_CARDS.filter((card) => {
    if (!card.gate) return slug === 'employees';
    if ('moduleSlug' in card.gate) return card.gate.moduleSlug === slug;
    return card.gate.requiresAnyModule.includes(slug);
  }).map((card) => card.key);
}

function layer(
  key: ReadinessLayerKey,
  status: ReadinessStatus,
  detail: string,
  href?: string
): ModuleReadinessLayer {
  return { key, label: LAYER_LABELS[key], status, detail, href };
}

function statusRank(status: ReadinessStatus): number {
  if (status === 'pass') return 1;
  if (status === 'warn') return 0.5;
  if (status === 'off') return 0;
  return 0;
}

function maturityLabel(score: number): string {
  if (score >= 8) return 'enterprise-ready';
  if (score >= 5) return 'operational';
  if (score >= 3) return 'basic';
  return 'scaffold';
}

export function buildModuleReadinessReport(
  state: CompanyModuleState
): ModuleReadinessReport {
  const cap = new Set(state.superAdminCap);
  const enabled = new Set(state.enabledSlugs);
  const dependencyIssues = validateDependencies(state.enabledSlugs);

  const modules = MODULE_SLUGS.map((slug): ModuleReadinessItem => {
    const definition = CORE_FUNCTION_CATALOG.find((item) => item.slug === slug);
    const inCap = slug === 'employees' || cap.has(slug);
    const isEnabled = slug === 'employees' || enabled.has(slug);
    const slugDependencyIssues = dependencyIssues.filter((issue) => issue.slug === slug);
    const nav = navCoverage(slug);
    const requiredPortals = REQUIRED_DAILY_PORTALS[slug];
    const routePaths = routeCoverage(slug);
    const apis = API_PREFIXES[slug];
    const permissions = permissionCoverage(slug);
    const setup = setupCoverage(slug);

    const layers: ModuleReadinessLayer[] = [
      layer(
        'catalog',
        definition && slugDependencyIssues.length === 0 ? 'pass' : 'fail',
        definition
          ? slugDependencyIssues.length === 0
            ? `${definition.id}: ${definition.dependsOn.length ? `depends on ${definition.dependsOn.join(', ')}` : 'no dependencies'}`
            : slugDependencyIssues.map((issue) => issue.message).join('; ')
          : 'Missing from core function catalog'
      ),
      layer(
        'company_state',
        !inCap ? 'off' : isEnabled ? 'pass' : 'warn',
        !inCap
          ? 'Not sold in this company cap'
          : isEnabled
            ? 'Enabled for this company'
            : 'Inside cap but currently turned off by company admin',
        '/admin/company-settings?tab=modules'
      ),
      layer(
        'session',
        !isEnabled ? 'off' : 'pass',
        !isEnabled
          ? 'Not expected in /api/auth/me enabledModules'
          : 'Expected in /api/auth/me enabledModules and module cookie after re-login',
        '/api/auth/me'
      ),
      layer(
        'navigation',
        !isEnabled ? 'off' : requiredPortals.every((portal) => nav.includes(portal)) ? 'pass' : 'warn',
        !isEnabled
          ? 'Hidden from role sidebars'
          : `Covered portals: ${nav.join(', ') || 'none'}; expected: ${requiredPortals.join(', ')}`,
        '/admin/setup-wizard'
      ),
      layer(
        'routes',
        !isEnabled ? 'off' : routePaths.length > 0 ? 'pass' : 'warn',
        !isEnabled
          ? 'Direct URLs should be blocked or absent'
          : routePaths.length > 0
            ? `Middleware-gated paths: ${routePaths.slice(0, 4).join(', ')}${routePaths.length > 4 ? ` +${routePaths.length - 4}` : ''}`
            : 'No middleware-gated portal route registered'
      ),
      layer(
        'apis',
        !isEnabled ? 'off' : apis.length > 0 ? 'pass' : 'warn',
        !isEnabled
          ? 'Module APIs should return 403 when called directly'
          : `Expected guarded API prefixes: ${apis.join(', ')}`
      ),
      layer(
        'rbac',
        !isEnabled
          ? 'off'
          : permissions.length > 0
            ? 'pass'
            : 'warn',
        !isEnabled
          ? 'Permissions ignored while module is off'
          : permissions.length > 0
            ? `Permission groups mapped: ${permissions.join(', ')}`
            : INFRASTRUCTURE_RBAC_MODULES.has(slug)
              ? 'Currently handled by infrastructure permissions; add module-specific permissions before enterprise sale'
              : 'No module-specific permission group yet',
        '/admin/rbac'
      ),
      layer(
        'setup',
        !isEnabled ? 'off' : setup.length > 0 ? 'pass' : 'warn',
        !isEnabled
          ? 'Setup card hidden while module is off'
          : setup.length > 0
            ? `Setup cards: ${setup.join(', ')}`
            : 'No setup card registered',
        '/admin/setup-wizard'
      ),
      layer(
        'daily_journey',
        !isEnabled ? 'off' : MATURITY_SCORE[slug] >= 5 ? 'pass' : 'warn',
        !isEnabled
          ? 'Daily journey hidden'
          : MATURITY_SCORE[slug] >= 5
            ? 'Enough daily screens exist for a basic production rollout'
            : 'Enabled in software, but still needs deeper daily UX before enterprise sale'
      ),
    ];

    const activeLayers = layers.filter((item) => item.status !== 'off');
    const score = activeLayers.length
      ? Math.round(
          (activeLayers.reduce((sum, item) => sum + statusRank(item.status), 0) / activeLayers.length) * 100
        )
      : 0;
    const hasFail = layers.some((item) => item.status === 'fail');
    const hasWarn = layers.some((item) => item.status === 'warn');
    const status: ReadinessStatus = !inCap || !isEnabled ? 'off' : hasFail ? 'fail' : hasWarn ? 'warn' : 'pass';
    const maturityScore = MATURITY_SCORE[slug];

    return {
      slug,
      name: definition?.name ?? slug,
      enabled: isEnabled,
      inCap,
      rolloutTier: ROLLOUT_TIER[slug],
      maturityScore,
      maturityLabel: maturityLabel(maturityScore),
      status,
      score,
      summary:
        status === 'pass'
          ? 'Ready for the current rollout tier.'
          : status === 'off'
            ? inCap
              ? 'Available in cap but not enabled.'
              : 'Not included in the company cap.'
            : 'Enabled, but still has readiness warnings.',
      layers,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      inCap: modules.filter((item) => item.inCap).length,
      enabled: modules.filter((item) => item.enabled).length,
      ready: modules.filter((item) => item.status === 'pass').length,
      warnings: modules.filter((item) => item.status === 'warn').length,
      blocked: modules.filter((item) => item.status === 'fail').length,
    },
    modules,
  };
}
