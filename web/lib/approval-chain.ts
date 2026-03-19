// ─── Dynamic Approval Chain ─────────────────────────────────────────────────
//
// Resolves the approval chain for a company, skipping roles that aren't enabled.
// This allows companies to operate without certain roles (e.g., no HR, no managers)
// while still maintaining a functional approval workflow.
//
// Example flows:
// - Full hierarchy: Employee → Manager → HR → Admin
// - No managers:    Employee → HR → Admin
// - No HR:          Employee → Manager → Admin
// - Minimal:        Employee → Admin
//

import prisma from '@/lib/prisma';
import type { Role } from '@prisma/client';

// Standard approval chain order
const ROLE_APPROVAL_ORDER: Role[] = [
  'employee',
  'team_lead',
  'manager',
  'director',
  'hr',
  'admin',
  'super_admin',
];

// Mapping of roles to their approval level
const ROLE_LEVELS: Record<Role, number> = {
  employee: 0,
  team_lead: 1,
  manager: 2,
  director: 3,
  hr: 4,
  admin: 5,
  super_admin: 6,
};

export interface ApprovalChainResult {
  chain: Role[];
  nextApprover: Role | null;
  finalApprover: Role;
  skipTo: (fromRole: Role) => Role | null;
}

/**
 * Gets the approval chain for a company.
 * Filters out roles that are not enabled.
 */
export async function getApprovalChain(companyId: string): Promise<ApprovalChainResult> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      enabled_roles: true,
      requires_hr: true,
      requires_manager: true,
    },
  });

  if (!company) {
    // Default chain if company not found
    return buildChainResult(['employee', 'hr', 'admin']);
  }

  const enabledRoles = new Set((company.enabled_roles as Role[]) || []);
  
  // Always include employee and admin
  enabledRoles.add('employee');
  enabledRoles.add('admin');

  // Build chain based on enabled roles
  const chain: Role[] = ROLE_APPROVAL_ORDER.filter(role => {
    if (role === 'super_admin') return false; // Never in company chain
    if (role === 'employee') return true;
    if (role === 'admin') return true;
    
    // Check company config for management roles
    if (['team_lead', 'manager', 'director'].includes(role)) {
      return company.requires_manager && enabledRoles.has(role);
    }
    
    // Check HR
    if (role === 'hr') {
      return company.requires_hr && enabledRoles.has(role);
    }
    
    return enabledRoles.has(role);
  });

  return buildChainResult(chain);
}

/**
 * Builds the chain result with helper methods.
 */
function buildChainResult(chain: Role[]): ApprovalChainResult {
  return {
    chain,
    nextApprover: chain.length > 1 ? chain[1] : null,
    finalApprover: chain[chain.length - 1],
    skipTo: (fromRole: Role) => {
      const fromIndex = chain.indexOf(fromRole);
      if (fromIndex === -1 || fromIndex >= chain.length - 1) {
        return null;
      }
      return chain[fromIndex + 1];
    },
  };
}

/**
 * Gets the next approver in the chain.
 * If the expected role is missing, skips to the next available role.
 */
export async function getNextApprover(
  companyId: string,
  currentRole: Role
): Promise<Role | null> {
  const { chain, skipTo } = await getApprovalChain(companyId);
  return skipTo(currentRole);
}

/**
 * Resolves the actual approver for a leave request.
 * Takes into account the employee's manager and the company's approval chain.
 */
export async function resolveApprover(
  companyId: string,
  employeeId: string,
  currentLevel: Role = 'employee'
): Promise<{
  approverId: string | null;
  approverRole: Role;
  reason: string;
}> {
  const { chain, skipTo } = await getApprovalChain(companyId);
  
  // Get the next role in the chain
  let nextRole = skipTo(currentLevel);
  
  if (!nextRole) {
    return {
      approverId: null,
      approverRole: 'admin',
      reason: 'No more approvers in chain',
    };
  }

  // Try to find an employee with this role
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { manager_id: true, department: true },
  });

  // For manager-level roles, try direct manager first
  if (['team_lead', 'manager', 'director'].includes(nextRole) && employee?.manager_id) {
    const manager = await prisma.employee.findUnique({
      where: { id: employee.manager_id },
      select: { id: true, primary_role: true, status: true },
    });

    if (manager && manager.status === 'active') {
      // Check if manager's role is at or above required level
      if (ROLE_LEVELS[manager.primary_role] >= ROLE_LEVELS[nextRole]) {
        return {
          approverId: manager.id,
          approverRole: manager.primary_role,
          reason: 'Direct manager',
        };
      }
    }
  }

  // Find any employee with the required role in the company
  const approver = await prisma.employee.findFirst({
    where: {
      org_id: companyId,
      primary_role: nextRole,
      status: 'active',
    },
    select: { id: true, primary_role: true },
  });

  if (approver) {
    return {
      approverId: approver.id,
      approverRole: approver.primary_role,
      reason: `Assigned ${nextRole}`,
    };
  }

  // Role not filled - skip to next
  const skippedRole = nextRole;
  nextRole = skipTo(nextRole);

  while (nextRole) {
    const fallbackApprover = await prisma.employee.findFirst({
      where: {
        org_id: companyId,
        primary_role: nextRole,
        status: 'active',
      },
      select: { id: true, primary_role: true },
    });

    if (fallbackApprover) {
      return {
        approverId: fallbackApprover.id,
        approverRole: fallbackApprover.primary_role,
        reason: `Escalated from ${skippedRole} (not assigned)`,
      };
    }

    nextRole = skipTo(nextRole);
  }

  // No approvers found at all - this shouldn't happen
  return {
    approverId: null,
    approverRole: 'admin',
    reason: 'No approvers available',
  };
}

/**
 * Checks if a role can approve for another role.
 */
export function canApprove(approverRole: Role, targetRole: Role): boolean {
  return ROLE_LEVELS[approverRole] > ROLE_LEVELS[targetRole];
}

/**
 * Gets all roles that can approve leaves in a company.
 */
export async function getApproverRoles(companyId: string): Promise<Role[]> {
  const { chain } = await getApprovalChain(companyId);
  // Remove employee (can't approve) and return the rest
  return chain.filter(role => role !== 'employee');
}
