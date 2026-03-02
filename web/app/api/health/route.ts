import { NextResponse } from 'next/server';
import { checkHealth } from '@/lib/enterprise/health';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const health = await checkHealth();
    const status = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
    return NextResponse.json(health, { status });
  } catch {
    return NextResponse.json(
      { status: 'unhealthy', error: 'Health check failed', timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
