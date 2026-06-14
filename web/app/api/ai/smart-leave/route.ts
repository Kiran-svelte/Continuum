/**
 * Smart Leave AI API
 *
 * GET  /api/ai/smart-leave?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD  — Risk assessment for a proposed leave
 * POST /api/ai/smart-leave — Suggest optimal leave dates
 *
 * @module api/ai/smart-leave
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, requireCompanyContext, AuthError } from '@/lib/auth-guard';
import { assessLeaveRisk, suggestLeaveDates } from '@/lib/ai-engine/smart-leave';
import { requireModuleForOrg } from '@/lib/core-functions/guard-handler';
import {
  getCompanyModuleState,
  isLeaveAiPredictionEnabled,
} from '@/lib/core-functions/resolve';
import { moduleDisabledResponse } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

/**
 * Assesses risk for a proposed leave period.
 *
 * @query startDate - ISO date string (required)
 * @query endDate   - ISO date string (required)
 * @returns LeaveRiskAssessment JSON.
 */
export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    const moduleGuard = await requireModuleForOrg(employee.org_id, 'leave');
    if (moduleGuard) return moduleGuard;
    const moduleState = await getCompanyModuleState(employee.org_id!);
    if (!isLeaveAiPredictionEnabled(moduleState)) {
      return moduleDisabledResponse('leave');
    }

    const startDate = request.nextUrl.searchParams.get('startDate');
    const endDate = request.nextUrl.searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'startDate and endDate query params are required (YYYY-MM-DD)' } },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid date format. Use YYYY-MM-DD.' } },
        { status: 400 }
      );
    }

    if (end < start) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'endDate must be on or after startDate.' } },
        { status: 400 }
      );
    }

    const assessment = await assessLeaveRisk(employee.id, employee.org_id, start, end);

    return NextResponse.json({ assessment });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Suggests optimal leave windows.
 *
 * @body durationDays - Number of days of leave desired (required, 1–30)
 * @returns Array of LeaveDateSuggestion sorted by lowest risk.
 */
export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    const moduleGuardPost = await requireModuleForOrg(employee.org_id, 'leave');
    if (moduleGuardPost) return moduleGuardPost;
    const moduleStatePost = await getCompanyModuleState(employee.org_id!);
    if (!isLeaveAiPredictionEnabled(moduleStatePost)) {
      return moduleDisabledResponse('leave');
    }

    const body = await request.json() as { durationDays?: number };
    const durationDays = body.durationDays;

    if (!durationDays || durationDays < 1 || durationDays > 30) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'durationDays is required (1–30).' } },
        { status: 400 }
      );
    }

    const suggestions = await suggestLeaveDates(employee.id, employee.org_id, durationDays);

    return NextResponse.json({ suggestions });
  } catch (error) {
    return handleApiError(error);
  }
}

// ─── Error Handler ────────────────────────────────────────────────────────────

function handleApiError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: { code: 'AUTH_ERROR', message: error.message } },
      { status: error.status }
    );
  }
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message } },
    { status: 500 }
  );
}
