/**
 * Continuum Guide — in-app helper chatbot API
 *
 * POST /api/ai/assistant
 * Body: { message: string, history?: { role, content }[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  AuthError,
  getAuthEmployee,
  requireCompanyContext,
} from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { getAuthModulePayload } from '@/lib/core-functions/resolve';
import prisma from '@/lib/prisma';
import {
  buildNavHintsForRole,
  resolvePortalSlugFromRole,
} from '@/lib/continuum-assistant/knowledge';
import { respondAssistantMessage } from '@/lib/continuum-assistant/respond';
import type { AssistantMessage } from '@/lib/continuum-assistant/types';
import type { PermissionCode } from '@/lib/rbac';
import {
  appendConversationMessages,
  loadConversationDraft,
  saveConversationDraft,
} from '@/lib/whatsapp/conversation-store';

export const dynamic = 'force-dynamic';

const actionDraftSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(['request_leave', 'approve_leave', 'reject_leave']),
  status: z.enum(['collecting', 'awaiting_confirmation']),
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  expiresAt: z.string(),
});

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  actionCommand: z.enum(['confirm', 'cancel']).optional(),
  actionDraft: actionDraftSchema.nullable().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(4000),
      })
    )
    .max(12)
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    if (employee.primary_role === 'super_admin') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Assistant is not available for super admin accounts.' } },
        { status: 403 }
      );
    }

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMIT', message: 'Too many requests. Please wait a moment.' } },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const raw = await request.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body.' } },
        { status: 400 }
      );
    }

    const company = await prisma.company.findUnique({
      where: { id: employee.org_id },
      select: { name: true },
    });

    const modulePayload = await getAuthModulePayload(employee.org_id);
    const permissions = employee.permissions.map((p) => String(p));
    const portalSlug = resolvePortalSlugFromRole(employee.primary_role);
    const navHints = buildNavHintsForRole(
      employee.primary_role,
      modulePayload.enabledModules,
      permissions
    );

    const storedConversation = await loadConversationDraft(employee.org_id, employee.id, 'web');
    const history: AssistantMessage[] =
      storedConversation.history.length > 0
        ? storedConversation.history
        : parsed.data.history ?? [];
    const context = {
      employeeId: employee.id,
      companyId: employee.org_id,
      companyName: company?.name?.trim() || 'your organization',
      role: employee.primary_role,
      portalSlug,
      displayName:
        [employee.first_name, employee.last_name].filter(Boolean).join(' ').trim() || 'User',
      enabledModules: modulePayload.enabledModules,
      permissions: permissions as PermissionCode[],
      navHints,
    };

    const result = await respondAssistantMessage(parsed.data.message, history, context, {
      request,
      actionDraft: storedConversation.actionDraft,
      actionCommand: parsed.data.actionCommand ?? null,
    });

    const updatedHistory: AssistantMessage[] = [
      ...history,
      { role: 'user', content: parsed.data.message },
      { role: 'assistant', content: result.reply },
    ];

    await saveConversationDraft(employee.org_id, employee.id, 'web', {
      history: updatedHistory,
      actionDraft: result.actionDraft ?? null,
    });
    await appendConversationMessages(employee.org_id, employee.id, 'web', [
      { role: 'user', content: parsed.data.message },
      { role: 'assistant', content: result.reply },
    ]);

    return NextResponse.json(
      {
        reply: result.reply,
        links: result.links,
        suggestions: result.suggestions,
        source: result.source,
        actionDraft: result.actionDraft ?? null,
        pendingAction: result.pendingAction ?? null,
        actionResult: result.actionResult ?? null,
      },
      { headers: getRateLimitHeaders(rateLimit) }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

function handleApiError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: { code: 'AUTH_ERROR', message: error.message } },
      { status: error.status }
    );
  }
  const message =
    process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message } },
    { status: 500 }
  );
}
