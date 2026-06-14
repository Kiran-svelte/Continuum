/**
 * API route guard: assert a module slug is enabled for the tenant.
 */

import { NextResponse } from 'next/server';
import { moduleDisabledResponse } from '@/lib/api-errors';
import type { ModuleSlug } from '@/lib/core-functions/catalog';
import {
  getCompanyModuleState,
  isModuleEnabled,
} from '@/lib/core-functions/resolve';

/**
 * Returns a 403 NextResponse when the module is disabled, otherwise null.
 */
export async function assertModule(
  companyId: string,
  slug: ModuleSlug
): Promise<NextResponse | null> {
  const state = await getCompanyModuleState(companyId);
  if (!isModuleEnabled(state, slug)) {
    return moduleDisabledResponse(slug);
  }
  return null;
}

/** Throws-style helper for handlers that prefer exceptions. */
export async function requireModule(
  companyId: string,
  slug: ModuleSlug
): Promise<void> {
  const blocked = await assertModule(companyId, slug);
  if (blocked) {
    const body = await blocked.json();
    const err = new Error(
      typeof body === 'object' && body && 'message' in body
        ? String((body as { message: string }).message)
        : 'Module disabled'
    );
    (err as Error & { status: number; response: NextResponse }).status = 403;
    (err as Error & { response: NextResponse }).response = blocked;
    throw err;
  }
}
