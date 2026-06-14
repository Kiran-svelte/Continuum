import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logChannelEvent } from '@/lib/whatsapp/safe-logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/internal/purge-chat-history
 * Retention cron — purges assistant messages older than 90 days.
 */
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const deleted = await prisma.assistantMessageRecord.deleteMany({
    where: { created_at: { lt: cutoff } },
  });

  logChannelEvent('info', 'assistant_history_purged', { deletedCount: deleted.count, cutoff: cutoff.toISOString() });

  return NextResponse.json({ success: true, deleted: deleted.count });
}
