import type { NextRequest } from 'next/server';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import type { AssistantActionKind } from '@/lib/continuum-assistant/action-types';

function appBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}

export async function forwardAuthenticatedApi(
  request: NextRequest,
  path: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const cookie = request.headers.get('cookie') ?? '';
  const res = await fetch(`${appBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie,
    },
    body: JSON.stringify(body),
  });

  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    data = { error: 'Invalid response from server' };
  }

  return { ok: res.ok, status: res.status, data };
}

export async function logAssistantAction(params: {
  companyId: string;
  actorId: string;
  kind: AssistantActionKind;
  draftId: string;
  payload: Record<string, unknown>;
  result: 'confirmed' | 'cancelled' | 'failed';
  entityId?: string;
  error?: string;
}): Promise<void> {
  const auditAction =
    params.kind === 'approve_leave'
      ? AUDIT_ACTIONS.LEAVE_APPROVE
      : params.kind === 'reject_leave'
        ? AUDIT_ACTIONS.LEAVE_REJECT
        : AUDIT_ACTIONS.LEAVE_SUBMIT;

  await createAuditLog({
    companyId: params.companyId,
    actorId: params.actorId,
    action: auditAction,
    entityType: 'assistant_action',
    entityId: params.entityId ?? params.draftId,
    newState: {
      source: 'continuum_assistant',
      action_kind: params.kind,
      draft_id: params.draftId,
      result: params.result,
      error: params.error ?? null,
      payload_summary: params.payload,
    },
  }).catch(() => {});
}
