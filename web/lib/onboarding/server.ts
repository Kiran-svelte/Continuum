import type { Prisma } from '@prisma/client';

function toMutableObject(value: Prisma.JsonValue | null | undefined): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return { ...value };
}

export async function canWriteOnboardingDraft(
  tx: Prisma.TransactionClient,
  companyId: string
): Promise<boolean> {
  const guard = await tx.company.updateMany({
    where: { id: companyId, onboarding_completed: false },
    data: { onboarding_completed: false },
  });

  return guard.count > 0;
}

export async function clearOnboardingDraft(
  tx: Prisma.TransactionClient,
  companyId: string
): Promise<void> {
  const settings = await tx.companySettings.findUnique({
    where: { company_id: companyId },
    select: { hr_alerts: true },
  });

  const hrAlerts = toMutableObject(settings?.hr_alerts);
  if (!hrAlerts || !('onboarding_draft' in hrAlerts)) {
    return;
  }

  delete hrAlerts.onboarding_draft;

  await tx.companySettings.update({
    where: { company_id: companyId },
    data: {
      hr_alerts: Object.keys(hrAlerts).length > 0 ? (hrAlerts as Prisma.InputJsonValue) : undefined,
    },
  });
}

export async function completeOnboardingState(
  tx: Prisma.TransactionClient,
  companyId: string,
  employeeId: string
): Promise<boolean> {
  const completion = await tx.company.updateMany({
    where: { id: companyId, onboarding_completed: false },
    data: { onboarding_completed: true, onboarding_step: 13 },
  });

  if (completion.count === 0) {
    return false;
  }

  await tx.employee.update({
    where: { id: employeeId },
    data: { status: 'active' },
  });

  await clearOnboardingDraft(tx, companyId);

  return true;
}
