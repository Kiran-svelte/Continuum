import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

export const dynamic = 'force-dynamic';

function verifyWhatsAppSignature(rawBody: string, signature: string | null): { ok: boolean; status: number; error: string } {
  const appSecret = process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET;
  if (!appSecret) {
    return { ok: false, status: 503, error: 'WhatsApp app secret is not configured' };
  }

  if (!signature || !signature.startsWith('sha256=')) {
    return { ok: false, status: 401, error: 'Missing WhatsApp signature' };
  }

  const expected = `sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) {
    return { ok: false, status: 401, error: 'Invalid WhatsApp signature' };
  }

  return timingSafeEqual(actualBuffer, expectedBuffer)
    ? { ok: true, status: 200, error: '' }
    : { ok: false, status: 401, error: 'Invalid WhatsApp signature' };
}

export async function GET(request: NextRequest) {
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const verifyToken = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode || verifyToken || challenge) {
    if (mode === 'subscribe' && token && verifyToken === token && challenge) {
      return new NextResponse(challenge, { status: 200 });
    }
    return NextResponse.json({ error: 'Webhook verification failed' }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    endpoint: '/api/webhooks/whatsapp',
    verifyTokenConfigured: Boolean(token),
  });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature-256');
  const verification = verifyWhatsAppSignature(rawBody, signature);
  if (!verification.ok) {
    return NextResponse.json({ error: verification.error }, { status: verification.status });
  }

  const body = rawBody ? JSON.parse(rawBody) : null;
  return NextResponse.json({
    received: true,
    endpoint: '/api/webhooks/whatsapp',
    hasPayload: body !== null,
  });
}
