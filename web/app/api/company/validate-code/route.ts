import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/company/validate-code?code=XXXX
 *
 * Public endpoint to validate a company join code before sign-up.
 * Returns whether the code is valid and the company name (for UX confirmation).
 * Rate-limited to prevent brute-force enumeration.
 */
export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const rateLimit = checkApiRateLimit(ip, 'auth');
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  const code = request.nextUrl.searchParams.get('code')?.trim().toUpperCase();
  if (!code || code.length < 1 || code.length > 20) {
    return NextResponse.json({ valid: false }, { status: 200 });
  }

  try {
    const company = await prisma.company.findUnique({
      where: { join_code: code },
      select: { name: true },
    });

    if (!company) {
      return NextResponse.json({ valid: false }, { status: 200 });
    }

    return NextResponse.json({
      valid: true,
      companyName: company.name,
    });
  } catch {
    return NextResponse.json({ valid: false }, { status: 200 });
  }
}
