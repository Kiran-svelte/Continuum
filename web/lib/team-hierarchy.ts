/**
 * Recursive team hierarchy utilities.
 *
 * Resolves the full reporting chain for a manager — not just direct reports,
 * but all transitive reports (reports of reports, etc.).
 *
 * Used by leave list, attendance, payroll visibility, and reimbursement
 * routes to give managers visibility into their full team.
 *
 * @module team-hierarchy
 */

import prisma from '@/lib/prisma';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Maximum recursion depth to prevent infinite loops from circular references */
const MAX_HIERARCHY_DEPTH = 10;

/** Maximum number of team members to return (prevents runaway queries) */
const MAX_TEAM_SIZE = 500;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TeamMember {
  /** Employee ID */
  id: string;
  /** Depth in hierarchy (1 = direct report, 2 = report-of-report, etc.) */
  depth: number;
}

// ─── Core Function ───────────────────────────────────────────────────────────

/**
 * Retrieves all employee IDs in the reporting chain of a given manager.
 *
 * Recursively walks the `manager_id` relationship tree, up to MAX_HIERARCHY_DEPTH
 * levels. Returns IDs with their depth for scoping decisions.
 *
 * @param managerId - The manager whose team to resolve
 * @param companyId - Company for tenant isolation
 * @param maxDepth - Maximum depth to traverse (default: MAX_HIERARCHY_DEPTH)
 * @returns Array of team member IDs with depth, excluding the manager themselves
 *
 * @example
 * ```ts
 * const team = await getFullTeamIds(managerId, companyId);
 * // team = [{ id: 'emp-1', depth: 1 }, { id: 'emp-2', depth: 2 }, ...]
 * ```
 */
export async function getFullTeamIds(
  managerId: string,
  companyId: string,
  maxDepth: number = MAX_HIERARCHY_DEPTH,
): Promise<TeamMember[]> {
  const allMembers: TeamMember[] = [];
  const visited = new Set<string>([managerId]);
  let currentLevelIds = [managerId];
  let depth = 0;

  while (currentLevelIds.length > 0 && depth < maxDepth && allMembers.length < MAX_TEAM_SIZE) {
    depth++;

    const directReports = await prisma.employee.findMany({
      where: {
        manager_id: { in: currentLevelIds },
        org_id: companyId,
        deleted_at: null,
        status: { in: ['active', 'probation', 'onboarding'] },
      },
      select: { id: true },
    });

    const newIds: string[] = [];
    for (const report of directReports) {
      if (!visited.has(report.id)) {
        visited.add(report.id);
        allMembers.push({ id: report.id, depth });
        newIds.push(report.id);
      }
    }

    currentLevelIds = newIds;
  }

  return allMembers;
}

/**
 * Returns just the flat array of employee IDs in the full team.
 * Convenience wrapper for use in Prisma `where: { id: { in: ids } }` queries.
 *
 * @param managerId - The manager whose team to resolve
 * @param companyId - Company for tenant isolation
 * @returns Array of employee IDs (direct + transitive reports)
 */
export async function getFullTeamEmployeeIds(
  managerId: string,
  companyId: string,
): Promise<string[]> {
  const members = await getFullTeamIds(managerId, companyId);
  return members.map((member) => member.id);
}

/**
 * Returns direct report IDs only (depth=1).
 * Use when only immediate reports are relevant (e.g., attendance regularization).
 *
 * @param managerId - Manager ID
 * @param companyId - Company for tenant isolation
 * @returns Array of direct report employee IDs
 */
export async function getDirectReportIds(
  managerId: string,
  companyId: string,
): Promise<string[]> {
  const directReports = await prisma.employee.findMany({
    where: {
      manager_id: managerId,
      org_id: companyId,
      deleted_at: null,
      status: { in: ['active', 'probation', 'onboarding'] },
    },
    select: { id: true },
  });

  return directReports.map((report) => report.id);
}

/**
 * Checks if a given employee is in the reporting chain of a manager.
 * Walks up the employee's manager chain, not down the manager's team tree.
 * This is O(depth) instead of O(team-size) — much faster for single checks.
 *
 * @param employeeId - Employee to check
 * @param managerId - Potential manager to check against
 * @param companyId - Company for tenant isolation
 * @returns true if the manager is anywhere in the employee's reporting chain
 */
export async function isInReportingChain(
  employeeId: string,
  managerId: string,
  companyId: string,
): Promise<boolean> {
  const visited = new Set<string>();
  let currentId: string | null = employeeId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);

    const record: { manager_id: string | null; org_id: string | null } | null =
      await prisma.employee.findUnique({
        where: { id: currentId },
        select: { manager_id: true, org_id: true },
      });

    if (!record || record.org_id !== companyId) {
      return false;
    }

    if (record.manager_id === managerId) {
      return true;
    }

    currentId = record.manager_id;

    if (visited.size > MAX_HIERARCHY_DEPTH) {
      return false;
    }
  }

  return false;
}
