/**
 * Maps ServiceResult to NextResponse for thin API route wrappers.
 */
import { NextResponse } from 'next/server';
import type { ServiceResult } from './types';

/**
 * Converts a ServiceResult into a NextResponse with appropriate status.
 */
export function serviceResultToResponse<T>(
  result: ServiceResult<T>,
  successStatus = 200
): NextResponse {
  if (result.ok) {
    return NextResponse.json(result.data, { status: successStatus });
  }

  const { code, message, httpStatus, details } = result.error;
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
    },
    { status: httpStatus }
  );
}

/**
 * Legacy-compatible error shape used by some existing routes ({ error: string }).
 */
export function serviceResultToLegacyResponse<T>(
  result: ServiceResult<T>,
  successStatus = 200
): NextResponse {
  if (result.ok) {
    return NextResponse.json(result.data, { status: successStatus });
  }

  return NextResponse.json(
    { error: result.error.message },
    { status: result.error.httpStatus }
  );
}
