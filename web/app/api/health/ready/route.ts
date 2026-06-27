/**
 * GET /api/health/ready
 * Readiness probe. Checks that all critical dependencies are healthy:
 * - Database (Prisma connection)
 * - Can run a basic query
 *
 * Returns 200 if all checks pass, 503 if any fail.
 *
 * @module api/health/ready
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUploadStorageReadiness } from '@/lib/storage/readiness';

export const dynamic = 'force-dynamic';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy';
  latencyMs: number;
  error?: string;
}

/**
 * Readiness check — verifies database connectivity and basic query ability.
 *
 * @returns JSON with per-dependency health status
 */
export async function GET() {
  const checks: HealthCheck[] = [];
  let isReady = true;

  // Database connectivity check
  const dbCheck = await checkDatabase();
  checks.push(dbCheck);
  if (dbCheck.status === 'unhealthy') {
    isReady = false;
  }

  const storageCheck = checkUploadStorage();
  checks.push(storageCheck);
  if (storageCheck.status === 'unhealthy') {
    isReady = false;
  }

  const status = isReady ? 200 : 503;

  return NextResponse.json(
    {
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks,
    },
    { status }
  );
}

/**
 * Check database connectivity by running a lightweight query.
 */
async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      name: 'database',
      status: 'healthy',
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      name: 'database',
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
}

function checkUploadStorage(): HealthCheck {
  const storage = getUploadStorageReadiness();

  if (storage.configured) {
    return {
      name: 'upload_storage',
      status: 'healthy',
      latencyMs: 0,
    };
  }

  return {
    name: 'upload_storage',
    status: 'unhealthy',
    latencyMs: 0,
    error: `Upload storage is not configured. Missing required env: ${storage.missingRequired.join(', ')}`,
  };
}
