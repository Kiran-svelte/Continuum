import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { normalizePhone } from '@/lib/phone/normalize';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const linkBodySchema = z.object({
  phone: z.string().min(7).max(20),
  externalId: z.string().min(7).max(20).regex(/^\d+$/),
});

/**
 * POST /api/channel/verify/link-from-web
 * Links WhatsApp after web-only verification (admin-assisted flow).
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const employee = await getAuthEmployee();
    const parsed = linkBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: { message: 'Invalid request body' } }, { status: 400 });
    }

    const normalized = normalizePhone(parsed.data.phone);
    if (!normalized.ok) {
      return NextResponse.json({ error: { message: normalized.message } }, { status: 400 });
    }

    await prisma.channelIdentityLink.updateMany({
      where: { employee_id: employee.id, channel: 'whatsapp', revoked_at: null },
      data: { revoked_at: new Date(), revoke_reason: 'new_verification' },
    });

    await prisma.channelIdentityLink.create({
      data: {
        company_id: employee.org_id ?? '',
        employee_id: employee.id,
        channel: 'whatsapp',
        external_id: parsed.data.externalId,
        phone_e164: normalized.e164,
        verified_at: new Date(),
      },
    });

    return NextResponse.json({ success: true, linked: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: { message: error.message } }, { status: error.status });
    }
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 });
  }
}
