import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/join
 *
 * DEPRECATED: Join by company code is disabled.
 * 
 * New auth flow:
 * - Company Owners/HR invite employees via /api/company/invite-user
 * - Employees accept invites via /api/invite/accept
 * - No self-service registration or join-by-code
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error: 'Join by company code is disabled',
      message: 'Registration is by invitation only. Please contact your company HR to receive an invitation link.',
      code: 'JOIN_CODE_DISABLED',
    },
    { status: 403 }
  );
}
