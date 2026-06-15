import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError, requirePermissionGuard} from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { canWriteOnboardingDraft } from '@/lib/onboarding/server';
import {
  onboardingStepPayloadSchemas,
  parseOnboardingStep,
  TOTAL_ONBOARDING_STEPS,
} from '@/lib/onboarding-step-contract';
import {
  formatValidationDetails,
  normalizeOnboardingStepPayload,
} from '@/lib/onboarding-step-payload-normalizer';
import { logOnboardingApiError, onboardingSafeErrorBody } from '@/lib/onboarding/api-errors';

export const dynamic = 'force-dynamic';

type DraftStore = {
  last_completed_step?: number;
  updated_at?: string;
  steps?: Record<string, unknown>;
};

function normalizeDraft(raw: unknown): DraftStore {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { steps: {} };
  }

  const candidate = raw as Record<string, unknown>;
  const steps = candidate.steps;

  return {
    last_completed_step:
      typeof candidate.last_completed_step === 'number'
        ? candidate.last_completed_step
        : undefined,
    updated_at:
      typeof candidate.updated_at === 'string' ? candidate.updated_at : undefined,
    steps:
      steps && typeof steps === 'object' && !Array.isArray(steps)
        ? (steps as Record<string, unknown>)
        : {},
  };
}

function readDraftFromHrAlerts(hrAlerts: unknown): DraftStore {
  if (!hrAlerts || typeof hrAlerts !== 'object' || Array.isArray(hrAlerts)) {
    return { steps: {} };
  }

  const map = hrAlerts as Record<string, unknown>;
  return normalizeDraft(map.onboarding_draft);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ step: string }> }
) {
  let employeeIdForLog: string | undefined;
  let companyIdForLog: string | undefined;

  try {
    const employee = await getAuthEmployee();
    employeeIdForLog = employee.id;
    requirePermissionGuard(employee, 'employee.onboard');

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const companyId = employee.org_id;
    companyIdForLog = companyId ?? undefined;
    if (!companyId) {
      return NextResponse.json({ error: 'Company not found for user' }, { status: 400 });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { onboarding_completed: true },
    });

    if (company?.onboarding_completed) {
      return NextResponse.json(
        { error: 'Onboarding is already completed for this company' },
        { status: 409 }
      );
    }

    const resolved = await params;
    const stepParam = resolved.step;

    const settings = await prisma.companySettings.findUnique({
      where: { company_id: companyId },
      select: { hr_alerts: true },
    });
    const draft = readDraftFromHrAlerts(settings?.hr_alerts);

    if (stepParam === 'all') {
      return NextResponse.json({
        success: true,
        total_steps: TOTAL_ONBOARDING_STEPS,
        draft,
      });
    }

    const step = parseOnboardingStep(stepParam);
    if (!step) {
      return NextResponse.json(
        { error: `Invalid step. Expected 1-${TOTAL_ONBOARDING_STEPS} or 'all'.` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      step,
      payload: draft.steps?.[String(step)] ?? null,
      last_completed_step: draft.last_completed_step ?? 0,
      updated_at: draft.updated_at ?? null,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logOnboardingApiError('step:get', error, {
      companyId: companyIdForLog,
      userId: employeeIdForLog,
    });
    return NextResponse.json(
      onboardingSafeErrorBody('ONBOARDING_STEP_LOAD_FAILED'),
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ step: string }> }
) {
  let employeeIdForLog: string | undefined;
  let companyIdForLog: string | undefined;

  try {
    const employee = await getAuthEmployee();
    employeeIdForLog = employee.id;
    requirePermissionGuard(employee, 'employee.onboard');

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const companyId = employee.org_id;
    companyIdForLog = companyId ?? undefined;
    if (!companyId) {
      return NextResponse.json({ error: 'Company not found for user' }, { status: 400 });
    }

    const resolved = await params;
    const step = parseOnboardingStep(resolved.step);
    if (!step) {
      return NextResponse.json(
        { error: `Invalid step. Expected 1-${TOTAL_ONBOARDING_STEPS}.` },
        { status: 400 }
      );
    }

    const payload = await request.json();
    const normalizedPayload = normalizeOnboardingStepPayload(step, payload);
    const schema = onboardingStepPayloadSchemas[step];
    const parsed = schema.safeParse(normalizedPayload);
    if (!parsed.success) {
      const detailMessage = formatValidationDetails(parsed.error.flatten());
      return NextResponse.json(
        {
          error: detailMessage ? `Validation failed: ${detailMessage}` : 'Validation failed',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    let draftBlocked = false;
    let outOfOrderMessage: string | null = null;
    let lastCompletedStep = 0;
    let newLastCompleted = 0;
    let updatedAt = '';

    await prisma.$transaction(async (tx) => {
      const canWriteDraft = await canWriteOnboardingDraft(tx, companyId);
      if (!canWriteDraft) {
        draftBlocked = true;
        return;
      }

      const settings = await tx.companySettings.findUnique({
        where: { company_id: companyId },
        select: { id: true, hr_alerts: true },
      });

      const previousHrAlerts =
        settings?.hr_alerts && typeof settings.hr_alerts === 'object' && !Array.isArray(settings.hr_alerts)
          ? (settings.hr_alerts as Record<string, unknown>)
          : {};

      const previousDraft = readDraftFromHrAlerts(previousHrAlerts);
      lastCompletedStep = previousDraft.last_completed_step ?? 0;

      if (step > lastCompletedStep + 1) {
        outOfOrderMessage = `Complete step ${lastCompletedStep + 1} before saving step ${step}.`;
        return;
      }

      newLastCompleted = Math.max(previousDraft.last_completed_step ?? 0, step);
      updatedAt = new Date().toISOString();

      const nextDraft: DraftStore = {
        last_completed_step: newLastCompleted,
        updated_at: updatedAt,
        steps: {
          ...(previousDraft.steps ?? {}),
          [String(step)]: parsed.data,
        },
      };

      const nextHrAlerts = {
        ...previousHrAlerts,
        onboarding_draft: nextDraft,
      };

      await tx.companySettings.upsert({
        where: { company_id: companyId },
        create: {
          id: uuidv4(),
          company_id: companyId,
          hr_alerts: nextHrAlerts as Prisma.InputJsonValue,
          updated_at: new Date(),
        },
        update: {
          hr_alerts: nextHrAlerts as Prisma.InputJsonValue,
        },
      });
    });

    if (draftBlocked) {
      return NextResponse.json(
        { error: 'Onboarding is already completed for this company' },
        { status: 409 }
      );
    }

    if (outOfOrderMessage) {
      return NextResponse.json(
        {
          error: outOfOrderMessage,
          last_completed_step: lastCompletedStep,
        },
        { status: 409 }
      );
    }

    await createAuditLog({
      companyId,
      actorId: employee.id,
      action: AUDIT_ACTIONS.COMPANY_SETTINGS_UPDATE,
      entityType: 'CompanySettings',
      entityId: companyId,
      newState: {
        onboarding_step_saved: step,
        last_completed_step: newLastCompleted,
      },
    });

    return NextResponse.json({
      success: true,
      step,
      last_completed_step: newLastCompleted,
      updated_at: updatedAt,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logOnboardingApiError('step:post', error, {
      companyId: companyIdForLog,
      userId: employeeIdForLog,
    });
    return NextResponse.json(
      onboardingSafeErrorBody('ONBOARDING_STEP_SAVE_FAILED'),
      { status: 500 }
    );
  }
}
