import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { isValidCronRequest } from '@/lib/cron-auth';

const SELF_HEALABLE_CODES = new Set([404, 500, 501]);

function normalizeErrorCode(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export async function POST(request: Request) {
  try {
    if (!isValidCronRequest(request.headers)) {
      return NextResponse.json(
        { ok: false, healed: false, reason: 'Unauthorized cron request' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const errorCode = normalizeErrorCode(body?.errorCode);

    if (!errorCode || !SELF_HEALABLE_CODES.has(errorCode)) {
      return NextResponse.json(
        {
          ok: false,
          healed: false,
          reason: 'Self-heal is only available for 404, 500, and 501 errors.',
          supportedCodes: Array.from(SELF_HEALABLE_CODES),
        },
        { status: 400 }
      );
    }

    // Server-side soft reset: revalidate top-level routes and status routes.
    revalidatePath('/');
    revalidatePath('/status');

    return NextResponse.json(
      {
        ok: true,
        healed: true,
        errorCode,
        steps: [
          'Revalidated route cache for / and /status',
          'Returned recovery signal for client hard refresh',
        ],
        health: {
          status: 'unknown',
          timestamp: new Date().toISOString(),
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown self-heal failure';

    return NextResponse.json(
      {
        ok: false,
        healed: false,
        reason: message,
      },
      { status: 500 }
    );
  }
}
