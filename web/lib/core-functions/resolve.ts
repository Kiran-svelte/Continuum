/**
 * Resolves company module state from CompanySettings.hr_alerts (Prisma)
 * or Appwrite `company_modules` when MODULE_STATE_SOURCE=appwrite.
 */

import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { toJsonRecord } from '@/lib/onboarding-runtime-config';
import {
  DEFAULT_ENABLED_SLUGS,
  DEFAULT_SUPER_ADMIN_CAP,
  isModuleSlug,
  type ModuleSlug,
} from '@/lib/core-functions/catalog';
import type {
  AuthModulePayload,
  CompanyModuleState,
  ModuleFeatureState,
} from '@/lib/core-functions/types';
import {
  clampEnabledToCap,
  ensureMandatorySlugs,
  normalizeCap,
} from '@/lib/core-functions/validate';

const HR_ALERTS_CAP_KEY = 'super_admin_cap';
const HR_ALERTS_ENABLED_KEY = 'enabled_modules';
const HR_ALERTS_FEATURES_KEY = 'module_features';

export type ModuleStateSource = 'prisma' | 'appwrite';

export function getModuleStateSource(): ModuleStateSource {
  const raw = process.env.MODULE_STATE_SOURCE?.trim().toLowerCase();
  return raw === 'appwrite' ? 'appwrite' : 'prisma';
}

async function getCompanyModuleStateFromAppwrite(
  companyId: string
): Promise<CompanyModuleState | null> {
  if (getModuleStateSource() !== 'appwrite') return null;
  try {
    const { isAppwriteConfigured, appwriteConfig } = await import('@/lib/appwrite/config');
    if (!isAppwriteConfigured()) return null;
    const { Query } = await import('node-appwrite');
    const { getAppwriteDatabases } = await import('@/lib/appwrite/client');
    const { APPWRITE_COLLECTIONS } = await import('@/lib/appwrite/collections');
    const db = getAppwriteDatabases();
    const result = await db.listDocuments(
      appwriteConfig.databaseId,
      APPWRITE_COLLECTIONS.companyModules,
      [Query.equal('company_id', companyId), Query.limit(1)]
    );
    const row = result.documents[0];
    if (!row) return null;
    const superAdminCap = normalizeCap(
      parseSlugArray(row.super_admin_cap) ?? DEFAULT_SUPER_ADMIN_CAP
    );
    let enabledSlugs = parseSlugArray(row.enabled_modules) ?? [...DEFAULT_ENABLED_SLUGS];
    enabledSlugs = clampEnabledToCap(enabledSlugs, superAdminCap);
    enabledSlugs = ensureMandatorySlugs(enabledSlugs, superAdminCap);
    return {
      enabledSlugs,
      superAdminCap,
      features: parseFeatures(row.module_features),
    };
  } catch (error) {
    console.warn('[module-state] Appwrite read failed, falling back to Prisma:', error);
    return null;
  }
}

function parseSlugArray(value: unknown): ModuleSlug[] | null {
  if (!Array.isArray(value)) return null;
  const slugs: ModuleSlug[] = [];
  for (const item of value) {
    if (typeof item === 'string' && isModuleSlug(item)) {
      slugs.push(item);
    }
  }
  return slugs.length > 0 ? slugs : null;
}

function parseFeatures(value: unknown): Record<string, ModuleFeatureState> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const raw = value as Record<string, unknown>;
  const features: Record<string, ModuleFeatureState> = {};
  for (const [key, entry] of Object.entries(raw)) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const row = entry as Record<string, unknown>;
    features[key] = {
      enabled: row.enabled === true,
      config:
        row.config && typeof row.config === 'object' && !Array.isArray(row.config)
          ? (row.config as Record<string, unknown>)
          : {},
    };
  }
  return features;
}

export async function getCompanyModuleState(
  companyId: string
): Promise<CompanyModuleState> {
  const fromAppwrite = await getCompanyModuleStateFromAppwrite(companyId);
  if (fromAppwrite) return fromAppwrite;

  const settings = await prisma.companySettings.findUnique({
    where: { company_id: companyId },
    select: { hr_alerts: true },
  });

  const hrAlerts = toJsonRecord(settings?.hr_alerts);

  const superAdminCap = normalizeCap(
    parseSlugArray(hrAlerts[HR_ALERTS_CAP_KEY]) ?? DEFAULT_SUPER_ADMIN_CAP
  );

  let enabledSlugs = parseSlugArray(hrAlerts[HR_ALERTS_ENABLED_KEY]) ?? [
    ...DEFAULT_ENABLED_SLUGS,
  ];
  enabledSlugs = clampEnabledToCap(enabledSlugs, superAdminCap);
  enabledSlugs = ensureMandatorySlugs(enabledSlugs, superAdminCap);

  const features = parseFeatures(hrAlerts[HR_ALERTS_FEATURES_KEY]);

  return {
    enabledSlugs,
    superAdminCap,
    features,
  };
}

export function isModuleEnabled(
  state: CompanyModuleState,
  slug: ModuleSlug
): boolean {
  if (slug === 'employees') return true;
  return state.enabledSlugs.includes(slug);
}

/** Whether smart-leave / AI widgets should render (leave module + feature flag). */
export function isLeaveAiPredictionEnabled(state: CompanyModuleState): boolean {
  if (!isModuleEnabled(state, 'leave')) return false;
  const leaveFeature = state.features.leave;
  if (!leaveFeature) return true;
  if (leaveFeature.enabled === false) return false;
  return leaveFeature.config?.ai_prediction !== false;
}

export async function getAuthModulePayload(
  orgId: string | null | undefined
): Promise<AuthModulePayload> {
  if (!orgId) {
    return {
      enabledModules: [...DEFAULT_ENABLED_SLUGS],
      moduleCap: [...DEFAULT_SUPER_ADMIN_CAP],
      moduleFeatures: {},
    };
  }
  const state = await getCompanyModuleState(orgId);
  return {
    enabledModules: state.enabledSlugs,
    moduleCap: state.superAdminCap,
    moduleFeatures: state.features,
  };
}

/** Persists module state into hr_alerts (merge). */
export async function saveCompanyModuleState(
  companyId: string,
  patch: Partial<Pick<CompanyModuleState, 'enabledSlugs' | 'superAdminCap' | 'features'>>
): Promise<CompanyModuleState> {
  const existing = await prisma.companySettings.findUnique({
    where: { company_id: companyId },
    select: { id: true, hr_alerts: true },
  });

  const hrAlerts = toJsonRecord(existing?.hr_alerts);
  const current = await getCompanyModuleState(companyId);

  const nextCap = patch.superAdminCap
    ? normalizeCap(patch.superAdminCap)
    : current.superAdminCap;

  let nextEnabled = patch.enabledSlugs
    ? clampEnabledToCap(patch.enabledSlugs, nextCap)
    : current.enabledSlugs;
  nextEnabled = ensureMandatorySlugs(nextEnabled, nextCap);

  const nextFeatures = patch.features
    ? { ...current.features, ...patch.features }
    : current.features;

  const nextHrAlerts = {
    ...hrAlerts,
    [HR_ALERTS_CAP_KEY]: nextCap,
    [HR_ALERTS_ENABLED_KEY]: nextEnabled,
    [HR_ALERTS_FEATURES_KEY]: nextFeatures,
  };

  if (existing) {
    await prisma.companySettings.update({
      where: { company_id: companyId },
      data: { hr_alerts: nextHrAlerts as unknown as Prisma.InputJsonValue },
    });
  } else {
    await prisma.companySettings.create({
      data: {
        id: crypto.randomUUID(),
        company_id: companyId,
        hr_alerts: nextHrAlerts as unknown as Prisma.InputJsonValue,
        updated_at: new Date(),
      },
    });
  }

  return {
    enabledSlugs: nextEnabled,
    superAdminCap: nextCap,
    features: nextFeatures,
  };
}

export function buildDefaultModuleSeed(
  moduleCap?: ModuleSlug[]
): Record<string, unknown> {
  const cap = moduleCap ? normalizeCap(moduleCap) : [...DEFAULT_SUPER_ADMIN_CAP];
  const enabled = clampEnabledToCap([...DEFAULT_ENABLED_SLUGS], cap);
  return {
    [HR_ALERTS_CAP_KEY]: cap,
    [HR_ALERTS_ENABLED_KEY]: ensureMandatorySlugs(enabled, cap),
    [HR_ALERTS_FEATURES_KEY]: {},
  };
}
