import { NextResponse } from 'next/server';
import { checkHealth, type HealthStatus } from '@/lib/enterprise/health';

export const dynamic = 'force-dynamic';

type PublicStatus = 'operational' | 'degraded' | 'outage';

function toPublicStatus(status: HealthStatus): PublicStatus {
  if (status === 'healthy') return 'operational';
  if (status === 'degraded') return 'degraded';
  return 'outage';
}

export async function GET() {
  const health = await checkHealth();
  const status = toPublicStatus(health.status);
  const affected = Object.entries(health.checks)
    .filter(([, check]) => check.status !== 'healthy')
    .map(([name, check]) => ({
      name,
      status: check.status,
      message: check.message,
    }));

  const defaultMessage =
    status === 'operational'
      ? 'All systems are operating normally.'
      : status === 'degraded'
        ? 'Some services are degraded. Review the status page for current details.'
        : 'Major outage in progress. Teams are actively restoring service.';

  return NextResponse.json({
    status,
    message: defaultMessage,
    affected,
    statusPage: '/status',
    supportPage: '/support',
    updatedAt: health.timestamp,
  });
}
