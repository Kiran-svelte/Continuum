/**
 * POST /api/hr/bulk-import
 * CSV bulk employee import endpoint.
 * Validates, upserts, and invites employees from a CSV file.
 * Required CSV headers: first_name, last_name, email, role, department, designation
 *
 * @module api/hr/bulk-import
 */
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError, requirePermissionGuard} from '@/lib/auth-guard';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import type { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

/** Max employees per single import batch. */
const MAX_BATCH_SIZE = 500;

/** Required CSV columns. */
const REQUIRED_COLUMNS = ['first_name', 'last_name', 'email'] as const;

/** All valid role values. */
const VALID_ROLES: Role[] = ['employee', 'manager', 'hr', 'admin', 'director', 'team_lead'];

interface CsvRow {
  first_name: string;
  last_name: string;
  email: string;
  role?: string;
  department?: string;
  designation?: string;
  manager_email?: string;
  phone?: string;
}

interface ImportResult {
  email: string;
  status: 'created' | 'updated' | 'skipped' | 'error';
  reason?: string;
}

/**
 * POST handler: Parse CSV body and bulk-import employees.
 * Body: multipart form-data with field "file" containing CSV.
 */
export async function POST(request: NextRequest) {
  try {
    const actor = await getAuthEmployee();
    requirePermissionGuard(actor, 'employee.onboard');

    const companyId = actor.org_id!;

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file uploaded. Send multipart/form-data with field "file".' }, { status: 400 });
    }

    const csvText = await (file as Blob).text();
    const { headers, rows } = parseCsv(csvText);

    const missingRequired = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
    if (missingRequired.length > 0) {
      return NextResponse.json(
        { error: `Missing required columns: ${missingRequired.join(', ')}` },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'CSV file is empty.' }, { status: 400 });
    }

    if (rows.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Too many rows. Max ${MAX_BATCH_SIZE} per import. Got ${rows.length}.` },
        { status: 400 }
      );
    }

    // Build a lookup of manager emails → IDs for the company
    const managerEmailLookup = await buildManagerEmailLookup(companyId);

    const results: ImportResult[] = [];
    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const row of rows) {
      const result = await processRow(row, companyId, actor.id, managerEmailLookup);
      results.push(result);
      if (result.status === 'created') createdCount++;
      else if (result.status === 'updated') updatedCount++;
      else if (result.status === 'error') errorCount++;
    }

    await createAuditLog({
      companyId,
      actorId: actor.id,
      action: AUDIT_ACTIONS.EMPLOYEE_CREATE,
      entityType: 'BulkImport',
      entityId: companyId,
      newState: { totalRows: rows.length, createdCount, updatedCount, errorCount },
    });

    return NextResponse.json({
      success: true,
      summary: { total: rows.length, created: createdCount, updated: updatedCount, errors: errorCount },
      results,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[BULK IMPORT] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse CSV text into headers array and typed rows.
 */
function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] || '').trim(); });
    rows.push(row as unknown as CsvRow);
  }

  return { headers, rows };
}

/**
 * Split a single CSV line respecting quoted fields.
 */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Build a map of email → employee id for manager lookups.
 */
async function buildManagerEmailLookup(companyId: string): Promise<Map<string, string>> {
  const managers = await prisma.employee.findMany({
    where: { org_id: companyId, deleted_at: null, primary_role: { in: ['manager', 'director', 'hr', 'admin'] } },
    select: { id: true, email: true },
  });
  return new Map(managers.map(m => [m.email.toLowerCase(), m.id]));
}

/**
 * Process a single CSV row — create or update the employee.
 */
async function processRow(
  row: CsvRow,
  companyId: string,
  actorId: string,
  managerLookup: Map<string, string>
): Promise<ImportResult> {
  const email = row.email?.trim().toLowerCase();

  if (!email || !email.includes('@')) {
    return { email: row.email || 'unknown', status: 'error', reason: 'Invalid or missing email' };
  }

  const role = resolveRole(row.role);
  const managerId = row.manager_email ? managerLookup.get(row.manager_email.toLowerCase()) : undefined;

  try {
    const existing = await prisma.employee.findUnique({
      where: { email },
      select: { id: true, org_id: true },
    });

    if (existing) {
      if (existing.org_id && existing.org_id !== companyId) {
        return { email, status: 'skipped', reason: 'Employee belongs to a different company' };
      }
      await prisma.employee.update({
        where: { email },
        data: {
          first_name: row.first_name || existing['first_name' as keyof typeof existing] as string,
          last_name: row.last_name || existing['last_name' as keyof typeof existing] as string,
          department: row.department || undefined,
          designation: row.designation || undefined,
          primary_role: role,
          phone: row.phone || undefined,
          manager_id: managerId,
          updated_at: new Date(),
          invited_by_id: actorId,
          org_id: companyId,
        },
      });
      return { email, status: 'updated' };
    }

    await prisma.employee.create({
      data: {
        id: randomUUID(),
        email,
        first_name: row.first_name || '',
        last_name: row.last_name || '',
        primary_role: role,
        department: row.department || undefined,
        designation: row.designation || undefined,
        phone: row.phone || undefined,
        manager_id: managerId,
        org_id: companyId,
        invited_by_id: actorId,
        invited_by_type: 'hr',
        status: 'onboarding',
        updated_at: new Date(),
      },
    });
    return { email, status: 'created' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[BULK IMPORT] Failed to process ${email}:`, message);
    return { email, status: 'error', reason: message };
  }
}

/**
 * Resolve a role string to a valid Role enum value, defaulting to 'employee'.
 */
function resolveRole(rawRole?: string): Role {
  if (!rawRole) return 'employee';
  const normalized = rawRole.trim().toLowerCase() as Role;
  return VALID_ROLES.includes(normalized) ? normalized : 'employee';
}
