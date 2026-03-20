import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/register
 *
 * DEPRECATED: Self-registration is disabled.
 * 
 * New auth flow:
 * - Super Admin creates Company Owners via /api/super-admin/users
 * - Company Owners invite employees via /api/company/invite-user
 * - Users accept invites via /api/invite/accept
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error: 'Self-registration is disabled',
      message: 'Registration is by invitation only. Please contact your company administrator or HR to request an invitation.',
      code: 'REGISTRATION_DISABLED',
    },
    { status: 403 }
  );
}
