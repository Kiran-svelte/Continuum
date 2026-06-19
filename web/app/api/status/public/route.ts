import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type PublicStatus = 'operational' | 'degraded' | 'outage';

const ALLOWED: PublicStatus[] = ['operational', 'degraded', 'outage'];

/**
 * GET /api/status/public
 *
 * Returns the current public-facing system status derived from environment variables.
 * Consumers use this to show a system status banner.
 *
 * @returns JSON with status, message, statusPage, supportPage, and updatedAt.
 */
export async function GET() {
  try {
    const raw = (process.env.PUBLIC_SYSTEM_STATUS || 'operational').toLowerCase();
    const status: PublicStatus = ALLOWED.includes(raw as PublicStatus)
      ? (raw as PublicStatus)
      : 'operational';

    const defaultMessage =
      status === 'operational'
        ? 'All systems are operating normally.'
        : status === 'degraded'
          ? 'Some services are degraded. Teams are investigating.'
          : 'Major outage in progress. Teams are actively restoring service.';

    const message = process.env.PUBLIC_SYSTEM_STATUS_MESSAGE?.trim() || defaultMessage;

    return NextResponse.json({
      status,
      message,
      statusPage: '/status',
      supportPage: '/support',
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[GET /api/status/public] Error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ status: 'operational', message: 'Status unavailable.', updatedAt: new Date().toISOString() }, { status: 500 });
  }
}
