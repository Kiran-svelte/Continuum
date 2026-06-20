import type { Prisma } from '@prisma/client';

/** Active (non-deleted) companies for platform metrics and listings. */
export const activeCompanyWhere: Prisma.CompanyWhereInput = {
  deleted_at: null,
};

/** Active employees for tenant-scoped and platform metrics. */
export const activeEmployeeWhere: Prisma.EmployeeWhereInput = {
  deleted_at: null,
  status: { notIn: ['terminated', 'exited'] },
};
