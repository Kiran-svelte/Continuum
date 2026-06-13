/**
 * Convenience wrapper for API route handlers.
 */

import { NextResponse } from 'next/server';
import { assertModule } from '@/lib/core-functions/assert-module';
import type { ModuleSlug } from '@/lib/core-functions/catalog';

export async function requireModuleForOrg(
  orgId: string | null | undefined,
  slug: ModuleSlug
): Promise<NextResponse | null> {
  if (!orgId) {
    return NextResponse.json({ error: 'Company context required' }, { status: 403 });
  }
  return assertModule(orgId, slug);
}
