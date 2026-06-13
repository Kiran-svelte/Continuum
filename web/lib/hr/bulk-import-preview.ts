/**
 * CSV pre-flight validation for HR bulk import (no DB writes).
 */

export const BULK_IMPORT_REQUIRED_COLUMNS = ['first_name', 'last_name', 'email'] as const;

export const BULK_IMPORT_OPTIONAL_COLUMNS = [
  'role',
  'department',
  'designation',
  'manager_email',
  'phone',
] as const;

export const BULK_IMPORT_COLUMN_ALIASES: Record<string, string> = {
  dept: 'department',
  department_name: 'department',
  job_title: 'designation',
  title: 'designation',
  manager: 'manager_email',
  reports_to: 'manager_email',
  mobile: 'phone',
  phone_number: 'phone',
};

export type BulkImportPreviewRow = {
  row: number;
  email: string;
  status: 'ok' | 'error' | 'warning';
  issues: string[];
};

export type BulkImportPreviewResult = {
  headers: string[];
  mappedHeaders: Record<string, string>;
  missingRequired: string[];
  rows: BulkImportPreviewRow[];
  summary: { total: number; ok: number; errors: number; warnings: number };
};

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else current += char;
  }
  result.push(current);
  return result;
}

export function parseCsvPreview(text: string): {
  headers: string[];
  rows: Record<string, string>[];
  mappedHeaders: Record<string, string>;
} {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [], mappedHeaders: {} };

  const rawHeaders = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const headers = rawHeaders.map((h) => BULK_IMPORT_COLUMN_ALIASES[h] ?? h);
  const mappedHeaders: Record<string, string> = {};
  rawHeaders.forEach((raw, i) => {
    if (raw !== headers[i]) mappedHeaders[raw] = headers[i];
  });

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] || '').trim();
    });
    rows.push(row);
  }

  return { headers, rows, mappedHeaders };
}

const VALID_ROLES = new Set(['employee', 'manager', 'hr', 'admin', 'director', 'team_lead']);

export function validateBulkImportCsv(csvText: string, maxRows = 500): BulkImportPreviewResult {
  const parsed = parseCsvPreview(csvText);
  const headers = parsed.headers;
  const mappedHeaders = parsed.mappedHeaders;

  const missingRequired = BULK_IMPORT_REQUIRED_COLUMNS.filter((col) => !headers.includes(col));

  if (missingRequired.length > 0) {
    return {
      headers,
      mappedHeaders,
      missingRequired,
      rows: [],
      summary: { total: 0, ok: 0, errors: 0, warnings: 0 },
    };
  }

  const rows: BulkImportPreviewRow[] = [];
  const emails = new Set<string>();

  parsed.rows.slice(0, maxRows).forEach((row, idx) => {
    const issues: string[] = [];
    const rowNum = idx + 2;
    const email = (row.email ?? '').toLowerCase();

    if (!row.first_name?.trim()) issues.push('Missing first_name');
    if (!row.last_name?.trim()) issues.push('Missing last_name');
    if (!email || !email.includes('@')) issues.push('Invalid email');
    else if (emails.has(email)) issues.push('Duplicate email in file');
    else emails.add(email);

    if (row.role?.trim() && !VALID_ROLES.has(row.role.trim().toLowerCase())) {
      issues.push(`Invalid role "${row.role}" — use employee, manager, hr, admin`);
    }

    const status: BulkImportPreviewRow['status'] =
      issues.some((i) => i.startsWith('Missing') || i.startsWith('Invalid')) ? 'error' : issues.length > 0 ? 'warning' : 'ok';

    rows.push({ row: rowNum, email: email || row.email || `row-${rowNum}`, status, issues });
  });

  return {
    headers,
    mappedHeaders,
    missingRequired: [],
    rows,
    summary: {
      total: rows.length,
      ok: rows.filter((r) => r.status === 'ok').length,
      errors: rows.filter((r) => r.status === 'error').length,
      warnings: rows.filter((r) => r.status === 'warning').length,
    },
  };
}

export function formatBulkImportPreviewForChat(preview: BulkImportPreviewResult): string {
  if (preview.missingRequired.length > 0) {
    return `CSV is missing required columns: **${preview.missingRequired.join(', ')}**. Required: **first_name, last_name, email**.`;
  }

  const lines = [
    `**Bulk import pre-flight** — ${preview.summary.total} rows`,
    `✓ ${preview.summary.ok} ready · ⚠ ${preview.summary.warnings} warnings · ✗ ${preview.summary.errors} errors`,
    '',
  ];

  if (Object.keys(preview.mappedHeaders).length > 0) {
    lines.push('**Column mapping applied:**');
    Object.entries(preview.mappedHeaders).forEach(([from, to]) => {
      lines.push(`• "${from}" → **${to}**`);
    });
    lines.push('');
  }

  const bad = preview.rows.filter((r) => r.status !== 'ok').slice(0, 8);
  if (bad.length > 0) {
    lines.push('**Fix these rows before importing:**');
    bad.forEach((r) => {
      lines.push(`• Row ${r.row} (${r.email}): ${r.issues.join('; ')}`);
    });
    if (preview.summary.errors + preview.summary.warnings > 8) {
      lines.push(`…and more. Fix the CSV, then upload at **HR → Bulk Import**.`);
    }
  } else {
    lines.push('CSV looks ready. Upload the file on **HR → Bulk Import** to import.');
  }

  return lines.join('\n');
}
