/**
 * Standard API error envelopes (Phase 0 contract).
 */

import { NextResponse } from 'next/server';
import type { ModuleSlug } from '@/lib/core-functions/catalog';

export function moduleDisabledResponse(
  module: ModuleSlug,
  message?: string
): NextResponse {
  return NextResponse.json(
    {
      error: 'MODULE_DISABLED',
      module,
      message:
        message ??
        `${module} is not enabled for your company. Contact your platform administrator.`,
    },
    { status: 403 }
  );
}

export function forbiddenResponse(
  permission: string,
  message?: string
): NextResponse {
  return NextResponse.json(
    {
      error: 'FORBIDDEN',
      permission,
      message: message ?? 'You do not have permission to perform this action.',
    },
    { status: 403 }
  );
}

export function validationErrorResponse(
  fields: Record<string, string>,
  message = 'Validation failed'
): NextResponse {
  return NextResponse.json(
    {
      error: 'VALIDATION_ERROR',
      message,
      fields,
    },
    { status: 422 }
  );
}
