/**
 * Tenant Context Middleware
 * 
 * Ensures all database queries are automatically scoped to the current user's company.
 * This provides Row-Level Security (RLS) at the application level.
 * 
 * CRITICAL FOR MULTI-TENANT SECURITY
 */

import { getCurrentUser } from './auth-service';
import { PrismaClient } from '@prisma/client';

export interface TenantContext {
  companyId: string;
  userId: string;
  userRole: string;
  isSuperAdmin: boolean;
}

/**
 * Get the current tenant context from the authenticated user
 */
export async function getTenantContext(): Promise<TenantContext | null> {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return null;
    }

    return {
      companyId: user.orgId || '',
      userId: user.id,
      userRole: user.role,
      isSuperAdmin: user.role === 'super_admin',
    };
  } catch (error) {
    console.error('[TENANT CONTEXT] Error getting tenant context:', error);
    return null;
  }
}

/**
 * Validate that the provided company ID matches the current tenant's company
 * Throws error if validation fails
 */
export async function validateTenantAccess(companyId: string): Promise<void> {
  const context = await getTenantContext();
  
  if (!context) {
    throw new Error('Unauthorized: No tenant context available');
  }

  // Super admins can access any tenant
  if (context.isSuperAdmin) {
    return;
  }

  // Regular users can only access their own company
  if (context.companyId !== companyId) {
    throw new Error('Forbidden: Access to this company is not allowed');
  }
}

/**
 * Create a Prisma middleware that automatically filters queries by company_id
 * This ensures tenant isolation at the database level
 */
export function createTenantMiddleware(prisma: PrismaClient) {
  // Models that have company_id or org_id field
  const tenantModels = [
    'Employee',
    'LeaveType',
    'LeaveBalance',
    'LeaveRequest',
    'LeaveEncashment',
    'LeaveRule',
    'ConstraintPolicy',
    'Attendance',
    'AttendanceRegularization',
    'ApprovalHierarchy',
    'OrganizationUnit',
    'JobLevel',
    'SalaryStructure',
    'SalaryComponent',
    'SalaryRevision',
    'PayrollRun',
    'PayrollSlip',
    'Document',
    'Reimbursement',
    'EmployeeMovement',
    'EmployeeStatusHistory',
    'ExitChecklist',
    'EmployeeShift',
    'Shift',
    'Notification',
    'NotificationTemplate',
    'NotificationPreference',
    'AuditLog',
    'SettingsAuditLog',
    'PublicHoliday',
    'CompanyRole',
    'LeaveLedger',
    'ApprovalWorkflow',
  ];

  // NOTE: Prisma 6 removed the `$use` middleware API.
  // Tenant filtering is now enforced at the query level in each API route via
  // the `requireCompanyContext` guard and explicit `where: { company_id }` clauses.
  // If row-level isolation via Prisma is required, migrate to Prisma Client Extensions:
  // https://www.prisma.io/docs/concepts/components/prisma-client/client-extensions
}

/**
 * Utility to ensure a user belongs to the specified company
 */
export async function ensureUserBelongsToCompany(
  userId: string,
  companyId: string,
  prisma: PrismaClient
): Promise<boolean> {
  const employee = await prisma.employee.findUnique({
    where: { id: userId },
    select: { org_id: true },
  });

  return employee?.org_id === companyId;
}

/**
 * Utility to get all users in the current tenant
 */
export async function getTenantUsers(prisma: PrismaClient) {
  const context = await getTenantContext();
  
  if (!context) {
    throw new Error('No tenant context available');
  }

  return prisma.employee.findMany({
    where: {
      org_id: context.companyId,
      deleted_at: null,
    },
  });
}

/**
 * Check if the current user has permission to access a resource
 * belonging to another user in the same company
 */
export async function canAccessUserData(
  targetUserId: string,
  prisma: PrismaClient
): Promise<boolean> {
  const context = await getTenantContext();
  
  if (!context) {
    return false;
  }

  // Super admins can access everything
  if (context.isSuperAdmin) {
    return true;
  }

  // Users can always access their own data
  if (context.userId === targetUserId) {
    return true;
  }

  // Check if both users belong to the same company
  const targetUser = await prisma.employee.findUnique({
    where: { id: targetUserId },
    select: { org_id: true },
  });

  if (!targetUser || targetUser.org_id !== context.companyId) {
    return false;
  }

  // Role-based access control
  const currentUser = await prisma.employee.findUnique({
    where: { id: context.userId },
    select: { primary_role: true, manager_id: true },
  });

  if (!currentUser) {
    return false;
  }

  // Admins and HR can access all user data in their company
  if (['admin', 'hr'].includes(currentUser.primary_role)) {
    return true;
  }

  // Managers can access their direct reports
  if (currentUser.primary_role === 'manager') {
    const isDirectReport = await prisma.employee.findFirst({
      where: {
        id: targetUserId,
        manager_id: context.userId,
      },
    });
    return !!isDirectReport;
  }

  return false;
}

