import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import { extractEmailVerificationState } from '@/lib/product-readiness';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [company, employees, subscription, payments] = await Promise.all([
    prisma.company.findUnique({ where: { id: user.orgId }, select: { onboarding_completed: true } }),
    prisma.employee.findMany({
      where: { org_id: user.orgId, deleted_at: null },
      select: { id: true, notification_preferences: true, last_login_at: true },
      take: 200,
    }),
    prisma.subscription.findFirst({ where: { company_id: user.orgId }, orderBy: { created_at: 'desc' } }),
    prisma.payment.count({ where: { company_id: user.orgId, status: 'completed' } }),
  ]);

  const verifiedCount = employees.filter((e) => extractEmailVerificationState(e.notification_preferences).verified).length;
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
