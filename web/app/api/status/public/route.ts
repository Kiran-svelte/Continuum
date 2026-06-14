import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type PublicStatus = 'operational' | 'degraded' | 'outage';

const ALLOWED: PublicStatus[] = ['operational', 'degraded', 'outage'];

export async function GET() {
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
}
