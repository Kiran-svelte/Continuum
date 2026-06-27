/**
 * Secure signed download URL API endpoint.
 *
 * GET /api/storage/download?key=<storage-key>
 *
 * - Requires authentication (any role)
 * - Validates the key belongs to the authenticated employee's company
 *   (tenant isolation: key must start with the company_id prefix)
 * - Generates a 1-hour presigned URL and redirects to it
 *
 * This way the actual R2/S3 bucket can stay fully private.
 * All document access goes through this endpoint.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee } from '@/lib/auth-guard';
import { generateSignedDownloadUrl } from '@/lib/storage/signed-url';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const actor = await getAuthEmployee(request);
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Validate key ─────────────────────────────────────────────────────────
  const key = request.nextUrl.searchParams.get('key');
  if (!key || key.length < 3) {
    return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
  }

  // Prevent path traversal
  if (key.includes('..') || key.startsWith('/')) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
  }

  // Tenant isolation: key must be prefixed with the actor's company_id
  // Storage keys are structured as: {folder}/{companyId}/{date}/{uuid}-{filename}
  const keyParts = key.split('/');
  const keyCompanyId = keyParts[1]; // second segment is always company_id

  if (!keyCompanyId || keyCompanyId !== actor.org_id) {
    // Super-admin can access any key
    const isSuperAdmin = actor.primary_role === 'super_admin';
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // ── Generate signed URL ───────────────────────────────────────────────────
  const result = await generateSignedDownloadUrl({ key, ttlSeconds: 3600 });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // ── Inline vs attachment download ─────────────────────────────────────────
  const inline = request.nextUrl.searchParams.get('inline') === 'true';

  if (inline) {
    // Redirect browser to the signed URL (for inline PDF view, image preview)
    return NextResponse.redirect(result.url);
  }

  // Return URL for client-side use (download link in UI)
  return NextResponse.json({
    url: result.url,
    expiresAt: result.expiresAt.toISOString(),
  });
}
