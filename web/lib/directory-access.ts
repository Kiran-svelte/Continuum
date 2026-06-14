import { assertModule } from '@/lib/core-functions/assert-module';
import type { AuthEmployee } from '@/lib/auth-guard';

/**
 * Directory is backed by employee records. Allow when either the directory
 * module or the core employees module is enabled so HR/admin always see reporting lines.
 */
export async function assertDirectoryModuleAccess(
  employee: AuthEmployee
): Promise<Response | null> {
  const orgId = employee.org_id!;
  const directoryGuard = await assertModule(orgId, 'directory');
  if (!directoryGuard) {
    return null;
  }
  const employeesGuard = await assertModule(orgId, 'employees');
  if (!employeesGuard) {
    return null;
  }
  return directoryGuard;
}
