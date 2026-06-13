/**
 * Core function / module gating types.
 */

import type { ModuleSlug } from '@/lib/core-functions/catalog';

export type { ModuleSlug };

export interface ModuleFeatureState {
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface CompanyModuleState {
  /** Slugs currently enabled for the tenant (includes mandatory). */
  enabledSlugs: ModuleSlug[];
  /** Maximum slugs super admin allows (owner cannot exceed). */
  superAdminCap: ModuleSlug[];
  /** Optional per-module feature flags (e.g. leave.ai_prediction). */
  features: Record<string, ModuleFeatureState>;
}

/** Payload exposed on /api/auth/me and related auth responses. */
export interface AuthModulePayload {
  enabledModules: ModuleSlug[];
  moduleCap: ModuleSlug[];
  moduleFeatures: Record<string, ModuleFeatureState>;
}
