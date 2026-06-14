import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [company, employees, subscription, payments, verifiedTokens] = await Promise.all([
    prisma.company.findUnique({ where: { id: user.orgId }, select: { onboarding_completed: true } }),
    prisma.employee.findMany({
      where: { org_id: user.orgId, deleted_at: null },
      select: { id: true, last_login_at: true },
      take: 200,
    }),
    prisma.subscription.findFirst({ where: { company_id: user.orgId }, orderBy: { created_at: 'desc' } }),
    prisma.payment.count({ where: { company_id: user.orgId, status: 'completed' } }),
    prisma.otpToken.findMany({
      where: { company_id: user.orgId, action: 'email_verify', is_used: true },
      select: { emp_id: true },
      take: 500,
    }),
  ]);

  const verifiedEmployeeIds = new Set(verifiedTokens.map((token) => token.emp_id));
  const verifiedCount = employees.filter((e) => verifiedEmployeeIds.has(e.id)).length;
  const recentlyActive = employees.filter((e) => e.last_login_at && Date.now() - new Date(e.last_login_at).getTime() < 7 * 24 * 60 * 60 * 1000).length;

  return NextResponse.json({
    readiness: {
      onboardingComplete: Boolean(company?.onboarding_completed),
      emailVerificationCoverage: employees.length ? verifiedCount / employees.length : 0,
      weeklyActiveCoverage: employees.length ? recentlyActive / employees.length : 0,
      billing: {
        trialOrActive: ['trial', 'active'].includes(subscription?.status || ''),
        plan: subscription?.plan || 'free',
        paidTransactions: payments,
      },
      security: {
        refreshTokenRotation: true,
        roleCookiesHttpOnly: true,
        auditLogsEnabled: true,
      },
    },
  });
}
