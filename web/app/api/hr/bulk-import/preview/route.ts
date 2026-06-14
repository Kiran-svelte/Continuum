/**
 * POST /api/hr/bulk-import/preview
 * Validates CSV without importing employees.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, AuthError, requirePermissionGuard } from '@/lib/auth-guard';
import {
  formatBulkImportPreviewForChat,
  validateBulkImportCsv,
} from '@/lib/hr/bulk-import-preview';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const actor = await getAuthEmployee();
    requirePermissionGuard(actor, 'employee.onboard');

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      const body = await request.json().catch(() => ({}));
      const csvText = typeof (body as { csv?: string }).csv === 'string' ? (body as { csv: string }).csv : '';
      if (!csvText.trim()) {
        return NextResponse.json({ error: 'Provide multipart file "file" or JSON { csv: "..." }.' }, { status: 400 });
      }
      const preview = validateBulkImportCsv(csvText);
      return NextResponse.json({
        preview,
        formatted: formatBulkImportPreviewForChat(preview),
      });
    }

    const csvText = await (file as Blob).text();
    const preview = validateBulkImportCsv(csvText);
    return NextResponse.json({
      preview,
      formatted: formatBulkImportPreviewForChat(preview),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
