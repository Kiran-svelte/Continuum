/**
 * Offer Letters API
 *
 * GET   /api/offer-letters              — List offers for company
 * POST  /api/offer-letters              — Create draft offer
 * PATCH /api/offer-letters?id=          — Update offer status (send/accept/reject/withdraw)
 *
 * @module api/offer-letters
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { generateOfferLetter, sendOffer, acceptOffer } from '@/lib/recruitment/pipeline-engine';
import type { OfferStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'recruitment.view_all');

    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    const where: Record<string, unknown> = { company_id: employee.org_id };
    if (status) where.status = status;

    const offers = await prisma.offerLetter.findMany({
      where,
      include: {
        Creator: { select: { first_name: true, last_name: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ offers });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'recruitment.create_offer');

    const body = await request.json() as {
      applicationId?: string;
      designation?: string;
      department?: string;
      ctcOffered?: number;
      joiningDate?: string;
    };

    if (!body.applicationId || !body.designation || !body.ctcOffered || !body.joiningDate) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'applicationId, designation, ctcOffered, and joiningDate are required' } },
        { status: 400 }
      );
    }

    if (body.ctcOffered <= 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ctcOffered must be positive' } },
        { status: 400 }
      );
    }

    const offer = await generateOfferLetter(body.applicationId, employee.org_id, {
      designation: body.designation,
      department: body.department,
      ctcOffered: body.ctcOffered,
      joiningDate: body.joiningDate,
      createdBy: employee.id,
    });

    return NextResponse.json({ offer }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'recruitment.manage_pipeline');

    const url = new URL(request.url);
    const offerId = url.searchParams.get('id');

    if (!offerId) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'id query param is required' } }, { status: 400 });
    }

    const body = await request.json() as {
      action: 'send' | 'accept' | 'reject' | 'withdraw';
      applicationId?: string;
    };

    switch (body.action) {
      case 'send':
        await sendOffer(offerId, employee.org_id);
        break;
      case 'accept':
        if (!body.applicationId) {
          return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'applicationId required for accept action' } }, { status: 400 });
        }
        await acceptOffer(offerId, body.applicationId, employee.org_id);
        break;
      case 'reject':
        await prisma.offerLetter.update({ where: { id: offerId }, data: { status: 'rejected', rejected_at: new Date() } });
        break;
      case 'withdraw':
        await prisma.offerLetter.update({ where: { id: offerId }, data: { status: 'withdrawn' } });
        break;
      default:
        return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid action' } }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

function handleApiError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: { code: 'AUTH_ERROR', message: error.message } }, { status: error.status });
  }
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
  return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
}
