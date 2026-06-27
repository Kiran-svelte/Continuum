/**
 * Secure signed download URL API endpoint.
 *
 * GET /api/storage/download?key=<storage-key>&inline=true
 *
 * R2/S3 objects stay private. Authenticated users receive a short-lived
 * signed URL only when the object key belongs to their company.
 */
import { NextRequest, NextResponse } from 'next/server';
import { AuthError, getAuthEmployee } from '@/lib/auth-guard';
import {
  buildStorageDownloadPath,
  isAppwriteStorageKey,
  isPrivateStorageKey,
  isStorageKeyForCompany,
  parseAppwriteStorageKey,
} from '@/lib/storage/r2-client';
import { generateSignedDownloadUrl } from '@/lib/storage/signed-url';
import { downloadAppwriteFile } from '@/lib/appwrite/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? 'unknown';

  try {
    const actor = await getAuthEmployee(request);
    const key = request.nextUrl.searchParams.get('key') ?? '';

    if (!isPrivateStorageKey(key)) {
      return NextResponse.json(
        { error: { code: 'INVALID_KEY', message: 'A valid private storage key is required.', requestId } },
        { status: 400 }
      );
    }

    const isSuperAdmin = actor.primary_role === 'super_admin';
    if (!isSuperAdmin && (!actor.org_id || !isStorageKeyForCompany(key, actor.org_id))) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'You do not have access to this file.', requestId } },
        { status: 403 }
      );
    }

    if (isAppwriteStorageKey(key)) {
      const parsed = parseAppwriteStorageKey(key);
      if (!parsed) {
        return NextResponse.json(
          { error: { code: 'INVALID_KEY', message: 'A valid Appwrite storage key is required.', requestId } },
          { status: 400 }
        );
      }

      if (request.nextUrl.searchParams.get('inline') !== 'true') {
        return NextResponse.json({
          url: buildStorageDownloadPath(key, true),
          expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        });
      }

      const file = await downloadAppwriteFile(parsed.fileId);
      const dispositionName = file.name.replace(/["\r\n]/g, '_');
      const body = file.buffer.buffer.slice(
        file.buffer.byteOffset,
        file.buffer.byteOffset + file.buffer.byteLength
      ) as ArrayBuffer;
      return new NextResponse(body, {
        headers: {
          'Content-Type': file.mimeType,
          'Content-Length': String(file.sizeOriginal || file.buffer.byteLength),
          'Content-Disposition': `inline; filename="${dispositionName}"`,
          'Cache-Control': 'private, max-age=60',
        },
      });
    }

    const result = await generateSignedDownloadUrl({ key, ttlSeconds: 3600 });
    if (!result.ok) {
      return NextResponse.json(
        { error: { code: 'SIGNING_FAILED', message: result.error, requestId } },
        { status: 502 }
      );
    }

    if (request.nextUrl.searchParams.get('inline') === 'true') {
      return NextResponse.redirect(result.url);
    }

    return NextResponse.json({
      url: result.url,
      expiresAt: result.expiresAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: { code: 'AUTH_ERROR', message: error.message, requestId } },
        { status: error.status }
      );
    }

    console.error('[Storage Download]', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error', requestId } },
      { status: 500 }
    );
  }
}
