import { NextResponse } from 'next/server';
import { getMetrics } from '@/lib/enterprise/metrics';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const metrics = await getMetrics();
    return new NextResponse(metrics, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to collect metrics' },
      { status: 500 }
    );
  }
}
