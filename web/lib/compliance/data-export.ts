import prisma from '@/lib/prisma';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DataExportResult {
  format: 'json' | 'csv';
  data: string;
  generatedAt: string;
  employeeId: string;
  companyId: string;
  sections: string[];
}

// ─── GDPR Article 20 — Data Portability Export ──────────────────────────────

/**
 * Exports all personal data for an employee in JSON or CSV format.
 * GDPR Article 20 compliance — right to data portability.
 */
export async function exportEmployeeData(
  employeeId: string,
  companyId: string,
  format: 'json' | 'csv' = 'json'
): Promise<DataExportResult> {
  const [employee, leaveBalances, leaveRequests, attendances, documents] =
    await Promise.all([
      prisma.employee.findUnique({
        where: { id: employeeId },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          phone: true,
          department: true,
          designation: true,
          date_of_joining: true,
          gender: true,
          country_code: true,
          status: true,
          created_at: true,
        },
      }),
      prisma.leaveBalance.findMany({
        where: { emp_id: employeeId, company_id: companyId },
        select: {
          leave_type: true,
          year: true,
          annual_entitlement: true,
          carried_forward: true,
          used_days: true,
          pending_days: true,
          encashed_days: true,
          remaining: true,
        },
      }),
      prisma.leaveRequest.findMany({
        where: { emp_id: employeeId, company_id: companyId },
        select: {
          id: true,
          leave_type: true,
          start_date: true,
          end_date: true,
          total_days: true,
          is_half_day: true,
          reason: true,
          status: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.attendance.findMany({
        where: { emp_id: employeeId, company_id: companyId },
        select: {
          date: true,
          check_in: true,
          check_out: true,
          status: true,
          is_wfh: true,
          total_hours: true,
        },
        orderBy: { date: 'desc' },
        take: 365,
      }),
      prisma.document.findMany({
        where: { emp_id: employeeId, company_id: companyId },
        select: {
          name: true,
          type: true,
          status: true,
          created_at: true,
        },
      }),
    ]);

  if (!employee) {
    throw new Error('Employee not found');
  }

  const exportData = {
    personal_information: employee,
    leave_balances: leaveBalances,
    leave_requests: leaveRequests,
    attendance_records: attendances,
    documents,
  };

  const sections = Object.keys(exportData);

  if (format === 'csv') {
    const csvData = convertToCSV(exportData);
    return {
      format: 'csv',
      data: csvData,
      generatedAt: new Date().toISOString(),
      employeeId,
      companyId,
      sections,
    };
  }

  return {
    format: 'json',
    data: JSON.stringify(exportData, null, 2),
    generatedAt: new Date().toISOString(),
    employeeId,
    companyId,
    sections,
  };
}

// ─── CSV Conversion ──────────────────────────────────────────────────────────

function convertToCSV(data: Record<string, unknown>): string {
  const sections: string[] = [];

  for (const [sectionName, sectionData] of Object.entries(data)) {
    sections.push(`\n--- ${sectionName.toUpperCase()} ---\n`);

    if (Array.isArray(sectionData) && sectionData.length > 0) {
      const headers = Object.keys(sectionData[0]);
      sections.push(headers.join(','));

      for (const row of sectionData) {
        const values = headers.map((h) => {
          const val = (row as Record<string, unknown>)[h];
          const str = val === null || val === undefined ? '' : String(val);
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        });
        sections.push(values.join(','));
      }
    } else if (sectionData && typeof sectionData === 'object' && !Array.isArray(sectionData)) {
      const obj = sectionData as Record<string, unknown>;
      const headers = Object.keys(obj);
      sections.push(headers.join(','));
      const values = headers.map((h) => {
        const val = obj[h];
        return val === null || val === undefined ? '' : String(val);
      });
      sections.push(values.join(','));
    }
  }

  return sections.join('\n');
}

/**
 * Generates a full backup export for a company (Enterprise feature).
 * Returns all company data in JSON format.
 */
export async function createFullBackup(companyId: string): Promise<string> {
  const [company, employees, leaveTypes, leaveRules, policies] =
    await Promise.all([
      prisma.company.findUnique({ where: { id: companyId } }),
      prisma.employee.findMany({
        where: { org_id: companyId, deleted_at: null },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          department: true,
          primary_role: true,
          status: true,
          date_of_joining: true,
        },
      }),
      prisma.leaveType.findMany({ where: { company_id: companyId } }),
      prisma.leaveRule.findMany({ where: { company_id: companyId } }),
      prisma.constraintPolicy.findMany({ where: { company_id: companyId } }),
    ]);

  const backup = {
    metadata: {
      company_id: companyId,
      exported_at: new Date().toISOString(),
      version: '1.0',
    },
    company,
    employees,
    leave_types: leaveTypes,
    leave_rules: leaveRules,
    constraint_policies: policies,
  };

  return JSON.stringify(backup, null, 2);
}
