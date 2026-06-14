/**
 * GET /api/health/live
 * Liveness probe. Returns 200 if the process is running.
 * Does NOT check external dependencies — that's what /ready is for.
 *
 * @module api/health/live
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Liveness check — the app is alive if this responds.
 */
export function GET() {
  return NextResponse.json(
    {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    { status: 200 }
  );
}
