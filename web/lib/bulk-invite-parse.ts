export type BulkInviteRow = {
  email?: string;
  username?: string;
  firstName: string;
  lastName: string;
  role: string;
  department?: string;
  password?: string;
};

export function parseBulkInviteText(raw: string, authMode: 'invite' | 'direct'): BulkInviteRow[] {
  const lines = raw
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rows: BulkInviteRow[] = [];

  for (const line of lines) {
    const parts = line.split(',').map((part) => part.trim());
    if (authMode === 'invite') {
      const [email, firstName, lastName, role, department] = parts;
      if (!email || !firstName || !lastName || !role) continue;
      rows.push({ email, firstName, lastName, role, department });
      continue;
    }

    const [username, email, firstName, lastName, role, department, password] = parts;
    if ((!username && !email) || !firstName || !lastName || !role || !password) continue;
    rows.push({ username, email, firstName, lastName, role, department, password });
  }

  return rows;
}

export async function readBulkInviteFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    throw new Error('Excel workbooks are not parsed in-browser yet. Save as CSV (UTF-8) and upload again.');
  }
  return file.text();
}
