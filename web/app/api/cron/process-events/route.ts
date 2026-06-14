/**
 * Domain Event Processing Cron Endpoint.
 *
 * POST /api/cron/process-events
 *
 * Called periodically to process pending domain events.
 * Protected by cron authentication.
 *
 * @module api/cron/process-events
 */

import { NextRequest, NextResponse } from 'next/server';
import { isValidCronRequest } from '@/lib/cron-auth';
import { processEvents } from '@/lib/event-bus';

/**
 * Processes a batch of pending domain events.
 * Should be called by a cron job every 30-60 seconds.
 *
 * @returns Processing summary with counts
 */
export async function POST(request: NextRequest) {
  try {
    if (!isValidCronRequest(request.headers)) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid cron secret' } },
        { status: 401 }
      );
    }

    const result = await processEvents();

    return NextResponse.json({
      message: 'Event processing complete',
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Event processing failed';
    return NextResponse.json(
      { error: { code: 'PROCESSING_ERROR', message } },
      { status: 500 }
    );
  }
}
