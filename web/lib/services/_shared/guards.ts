/**
 * Shared guard helpers for headless services.
 * Return ServiceError instead of throwing — routes map to HTTP.
 */
import prisma from '@/lib/prisma';
import type { ModuleSlug } from '@/lib/core-functions/catalog';
import { getCompanyModuleState, isModuleEnabled } from '@/lib/core-functions/resolve';
import { hasPermission, type PermissionCode } from '@/lib/rbac';
import { isInNoticePeriod } from '@/lib/notice-period-guard';
import { serviceError, type ServiceError, type AssistantExecutionContext } from '../types';

/**
 * Ensures company onboarding is complete.
 */
export async function guardCompanySetup(orgId: string): Promise<ServiceError | null> {
  const company = await prisma.company.findUnique({
    where: { id: orgId },
    select: { onboarding_completed: true },
  });

  if (!company) {
    return serviceError('FORBIDDEN', 'Company not found for user', 400);
  }

  if (!company.onboarding_completed) {
    return serviceError(
      'COMPANY_SETUP_INCOMPLETE',
      'Complete company setup before using HR features.',
      403
    );
  }

  return null;
}

/**
 * Ensures a module slug is enabled for the tenant.
 */
export async function guardModule(
  orgId: string,
  slug: ModuleSlug
): Promise<ServiceError | null> {
  const state = await getCompanyModuleState(orgId);
  if (!isModuleEnabled(state, slug)) {
    return serviceError(
      'MODULE_DISABLED',
      `The ${slug} module is not enabled for your company.`,
      403
    );
  }
  return null;
}

/**
 * Ensures the context has a specific permission code.
 */
export function guardPermission(
  ctx: Pick<AssistantExecutionContext, 'permissions'>,
  code: PermissionCode
): ServiceError | null {
  if (!hasPermission(ctx.permissions as PermissionCode[], code)) {
    return serviceError('FORBIDDEN', 'Permission denied', 403);
  }
  return null;
}

/**
 * Blocks leave submissions during notice period.
 */
export function guardNotInNoticePeriod(status: string): ServiceError | null {
  if (isInNoticePeriod({ status })) {
    return serviceError(
      'NOTICE_PERIOD',
      'You cannot submit new requests during your notice period. Please contact HR for assistance.',
      403
    );
  }
  return null;
}
