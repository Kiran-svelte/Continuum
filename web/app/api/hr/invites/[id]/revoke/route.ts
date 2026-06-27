/**
 * Revoke a pending employee invite.
 *
 * POST /api/hr/invites/[id]/revoke
 *
 * EmployeeInvite has no 'status' field — revoking is done by
 * setting expires_at to the past (token becomes unusable immediately).
 * Only HR/Admin can revoke invites.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee } from '@/lib/auth-guard';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const actor = await getAuthEmployee(request);
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!['admin', 'hr', 'super_admin'].includes(actor.primary_role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const orgId = actor.org_id ?? '';

  // Try EmployeeInvite first (revoke by setting expires_at to past)
  const employeeInvite = await prisma.employeeInvite.findFirst({
    where: { id, company_id: orgId, used_at: null },
  });

  if (employeeInvite) {
    // Expire immediately — the token becomes unusable
    await prisma.employeeInvite.update({
      where: { id },
      data: { expires_at: new Date(0) },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invite not found or already used' }, { status: 404 });
}
