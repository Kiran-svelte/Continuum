import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/invite?token=XXX
 * Validates an invite token and returns invite details (for sign-up page pre-fill)
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token || typeof token !== 'string' || token.length < 16) {
    return NextResponse.json({ error: 'Invalid invite token' }, { status: 400 });
  }

  try {
    const invite = await prisma.employeeInvite.findUnique({
      where: { token },
      include: {
        company: { select: { id: true, name: true, join_code: true } },
      },
    });

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    if (invite.used_at) {
      return NextResponse.json({ error: 'This invite has already been used' }, { status: 410 });
    }

    if (new Date() > invite.expires_at) {
      return NextResponse.json({ error: 'This invite has expired' }, { status: 410 });
    }

    return NextResponse.json({
      valid: true,
      invite: {
        email: invite.email,
        role: invite.role,
        department: invite.department,
        company_name: invite.company.name,
        company_join_code: invite.company.join_code,
        expires_at: invite.expires_at,
      },
    });
  } catch (error) {
    console.error('[ValidateInvite] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
