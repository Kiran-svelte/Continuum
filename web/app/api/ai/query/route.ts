/**
 * Workforce Analytics NLP API
 *
 * POST /api/ai/query — Natural language HR analytics query
 *
 * Body: { question: string }
 *
 * @module api/ai/query
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, requireCompanyContext, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { processHrQuery } from '@/lib/ai-engine/workforce-nlp';

export const dynamic = 'force-dynamic';

/**
 * Accepts a natural-language HR analytics question and returns structured data.
 * Requires `reports.view_all` permission.
 *
 * @returns 200 with NlpQueryResult containing data and chart metadata.
 */
export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'reports.view_all');

    const body = await request.json() as { question?: string };
    const { question } = body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'question is required and must be a non-empty string' } },
        { status: 400 }
      );
    }

    if (question.length > 500) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'question must be 500 characters or fewer' } },
        { status: 400 }
      );
    }

    const result = await processHrQuery(question.trim(), employee.org_id);
    return NextResponse.json({ result });
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
