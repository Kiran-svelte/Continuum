import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email-service';
import { getCurrentUser } from '@/lib/auth-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'hr', 'super_admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  // Regular admin/hr can only trigger their own company's sequence; super_admin
  // may target any company (e.g. to manually nudge a specific customer).
  const companyId = typeof body.companyId === 'string' && body.companyId ? body.companyId : user.orgId;
  const day = Number(body.day || 0);
  if (![0, 3, 7].includes(day)) {
    return NextResponse.json({ error: 'day(0/3/7) is required' }, { status: 400 });
  }
  if (companyId !== user.orgId && user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admins = await prisma.employee.findMany({
    where: { org_id: companyId, primary_role: 'admin', status: { not: 'terminated' } },
    select: { email: true, first_name: true },
    take: 5,
  });

  const subjectMap: Record<number, string> = {
    0: 'Welcome to Continuum - start here',
    3: 'Day 3: complete your onboarding checklist',
    7: 'Day 7: activate your team and workflows',
  };
  const bodyMap: Record<number, string> = {
    0: 'Finish workspace setup, add teammates, and configure approvals.',
    3: 'You are close. Connect CRM and complete required go-live tasks.',
    7: 'You are one step away from full value. Invite managers and run your first cycle.',
  };

  await Promise.all(
    admins.map((admin) =>
      sendEmail(
        admin.email,
        subjectMap[day],
        `<p>Hi ${admin.first_name || 'there'},</p><p>${bodyMap[day]}</p>`,
        { category: 'welcome-sequence' }
      )
    )
  );
  return NextResponse.json({ success: true, recipients: admins.length, day });
}
