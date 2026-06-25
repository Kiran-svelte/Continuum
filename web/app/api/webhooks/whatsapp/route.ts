/**
 * WhatsApp Cloud API Webhook Handler
 * Route: /api/webhooks/whatsapp
 *
 * GET  — Meta webhook verification challenge (hub.mode, hub.verify_token, hub.challenge)
 * POST — Inbound message handler
 *
 * Security model (G5/G6 gates):
 *   1. HMAC-SHA256 signature verification (X-Hub-Signature-256) — reject before any DB access
 *   2. Message-level deduplication via message_id (IdempotencyRecord / in-memory cache)
 *   3. Blocklist check (ChannelBlocklist) — 200 but no AI call
 *   4. ChannelIdentityLink lookup — maps wa_id → employee
 *   5. Revoke check — revoked links rejected
 *   6. Tenant isolation — org_id cross-check via buildContextFromLink
 *   7. Full assistant turn via respondHeadless (same service layer as web)
 *   8. Outbound send via encrypted token (never plaintext in DB or logs)
 *   9. Audit trail — AssistantMessageRecord rows for every inbound + outbound
 *  10. Always returns 200 — WhatsApp retries on any non-200 response
 *
 * Implements ZERO_UI_V1_ACTIONS G5 + G6 sign-off gates.
 */
import { after, NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyWhatsAppSignature } from '@/lib/whatsapp/verify-signature';
import { getWhatsAppTenantConfigByPhoneNumberId } from '@/lib/whatsapp/tenant-config';
import { sendWhatsAppMessages } from '@/lib/whatsapp/send';
import { loadConversationDraft, saveConversationDraft } from '@/lib/whatsapp/conversation-store';
import { buildContextFromLink } from '@/lib/channel/context-from-link';
import { respondHeadless } from '@/lib/continuum-assistant/respond-headless';
import { assistantReplyToWhatsAppMessages } from '@/lib/continuum-assistant/adapters/whatsapp';
import { logChannelEvent } from '@/lib/whatsapp/safe-logger';
import { waIdToE164 } from '@/lib/phone/normalize';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

// ─── Env Guards ──────────────────────────────────────────────────────────────

const WEBHOOK_SECRET = process.env.WHATSAPP_WEBHOOK_SECRET ?? '';
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? '';

// ─── Types (Meta Cloud API payload shapes) ────────────────────────────────────

interface MetaTextMessage {
  type: 'text';
  id: string;
  from: string;
  text: { body: string };
  timestamp: string;
}

interface MetaInteractiveReply {
  type: 'interactive';
  id: string;
  from: string;
  interactive: { type: 'button_reply'; button_reply: { id: string; title: string } };
  timestamp: string;
}

type MetaMessage = MetaTextMessage | MetaInteractiveReply;

interface MetaWebhookEntry {
  id: string; // phone_number_id
  changes: Array<{
    value: {
      messaging_product: string;
      metadata: { phone_number_id: string; display_phone_number: string };
      contacts?: Array<{ wa_id: string; profile: { name: string } }>;
      messages?: MetaMessage[];
      statuses?: unknown[];
    };
  }>;
}

interface MetaWebhookPayload {
  object: string;
  entry: MetaWebhookEntry[];
}

// ─── GET — Webhook verification challenge ────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode !== 'subscribe' || token !== VERIFY_TOKEN || !challenge) {
    logChannelEvent('warn', 'whatsapp_webhook_verify_failed', { mode, hasToken: !!token });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  logChannelEvent('info', 'whatsapp_webhook_verified', {});
  // Must return challenge as plain text
  return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
}

// ─── POST — Inbound message handler ─────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── Step 1: Read raw body for HMAC verification ──────────────────────────
  let rawBody: Buffer;
  try {
    rawBody = Buffer.from(await request.arrayBuffer());
  } catch {
    // Always return 200 to WhatsApp — a body read error is not a WhatsApp error
    return ok200();
  }

  // ── Step 2: HMAC-SHA256 signature verification ───────────────────────────
  const signature = request.headers.get('x-hub-signature-256');
  if (!WEBHOOK_SECRET || !verifyWhatsAppSignature(rawBody, signature, WEBHOOK_SECRET)) {
    logChannelEvent('warn', 'whatsapp_webhook_signature_invalid', {
      hasSignature: !!signature,
      hasSecret: !!WEBHOOK_SECRET,
    });
    // Return 401 (not 200) here — an invalid signature is not a valid WhatsApp delivery
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Step 3: Parse payload ────────────────────────────────────────────────
  let payload: MetaWebhookPayload;
  try {
    payload = JSON.parse(rawBody.toString('utf8')) as MetaWebhookPayload;
  } catch {
    logChannelEvent('warn', 'whatsapp_webhook_parse_error', {});
    return ok200();
  }

  if (payload.object !== 'whatsapp_business_account') {
    return ok200();
  }

  // ── Step 4: Process each entry/change/message ────────────────────────────
  try {
    after(() => processEntriesAsync(payload.entry));
  } catch {
    // Local/test runtimes may not provide waitUntil. In that case, process
    // inline instead of silently losing the webhook.
    await processEntriesAsync(payload.entry);
  }

  return ok200();
}

// ─── Core Processing ─────────────────────────────────────────────────────────

async function processEntriesAsync(entries: MetaWebhookEntry[]): Promise<void> {
  for (const entry of entries) {
    for (const change of entry.changes) {
      const messages = change.value.messages;
      if (!messages?.length) continue;

      const phoneNumberId = change.value.metadata.phone_number_id;

      for (const msg of messages) {
        try {
          await processInboundMessage(msg, phoneNumberId);
        } catch (err) {
          logChannelEvent('error', 'whatsapp_message_processing_error', {
            error: err instanceof Error ? err.message : 'unknown',
            messageId: msg.id,
          });
        }
      }
    }
  }
}

async function processInboundMessage(
  msg: MetaMessage,
  phoneNumberId: string
): Promise<void> {
  const messageId = msg.id;
  const fromWaId = msg.from; // wa_id (digits, e.g. "919876543210")
  const fromE164 = waIdToE164(fromWaId);
  const timestamp = msg.timestamp;

  // Extract text content (handles both text messages and interactive button replies)
  const messageText = extractMessageText(msg);
  if (!messageText) {
    logChannelEvent('info', 'whatsapp_unsupported_message_type', { type: msg.type, messageId });
    return;
  }

  logChannelEvent('info', 'whatsapp_message_received', {
    messageId,
    fromSuffix: fromWaId.slice(-4),
    type: msg.type,
    timestamp,
  });

  // ── Step 5: Look up ChannelIdentityLink by external_id (wa_id) ───────────
  const tenantConfig = await getWhatsAppTenantConfigByPhoneNumberId(phoneNumberId);
  if (!tenantConfig) {
    logChannelEvent('warn', 'whatsapp_tenant_not_configured_for_phone_number', {
      phoneNumberIdSuffix: phoneNumberId.slice(-4),
    });
    return;
  }

  const link = await prisma.channelIdentityLink.findFirst({
    where: {
      company_id: tenantConfig.companyId,
      channel: 'whatsapp',
      OR: [{ external_id: fromWaId }, { phone_e164: fromE164 }],
      revoked_at: null,
    },
    select: {
      id: true,
      company_id: true,
      employee_id: true,
      channel: true,
      revoked_at: true,
    },
  });

  if (!link) {
    // Unknown sender — no linked employee. Cannot respond (no way to identify tenant).
    logChannelEvent('warn', 'whatsapp_unknown_sender', { fromSuffix: fromWaId.slice(-4) });
    return;
  }

  // ── Step 6: Blocklist check ───────────────────────────────────────────────
  const isBlocked = await prisma.channelBlocklist.findFirst({
    where: {
      company_id: link.company_id,
      channel: 'whatsapp',
      external_id: fromWaId,
    },
    select: { id: true },
  });

  if (isBlocked) {
    logChannelEvent('warn', 'whatsapp_blocked_sender', {
      fromSuffix: fromWaId.slice(-4),
      companyId: link.company_id,
    });
    // Silently drop — do not send any reply to blocked senders
    return;
  }

  // ── Step 7: Deduplication — prevent double-processing replayed message_ids ─
  const idempotencyKey = `wa_msg_${messageId}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const idempotencyRecord = await prisma.idempotencyRecord
    .create({
      data: {
        company_id: link.company_id,
        employee_id: link.employee_id,
        idempotency_key: idempotencyKey,
        response_json: { status: 'processing' },
        http_status: 202,
        expires_at: expiresAt,
      },
      select: { id: true },
    })
    .catch(() => null);

  if (!idempotencyRecord) {
    logChannelEvent('info', 'whatsapp_duplicate_message_dropped', { messageId });
    return;
  }

  // ── Step 8: Load tenant WhatsApp config (for outbound send) ──────────────
  try {
  // ── Step 9: Build execution context ──────────────────────────────────────
  let execCtx;
  try {
    execCtx = await buildContextFromLink(link, {
      externalMessageId: messageId,
      idempotencyKey,
    });
  } catch (err) {
    logChannelEvent('warn', 'whatsapp_context_build_failed', {
      error: err instanceof Error ? err.message : 'unknown',
      fromSuffix: fromWaId.slice(-4),
    });
    await markIdempotencyRecord(link.company_id, link.employee_id, idempotencyKey, {
      processed: false,
      skipped: true,
      reason: 'context_build_failed',
    }, 200, expiresAt);
    return;
  }

  // ── Step 10: Load conversation history + draft ────────────────────────────
  const { history, actionDraft } = await loadConversationDraft(
    link.company_id,
    link.employee_id,
    'whatsapp'
  );

  // ── Step 11: Get or ensure AssistantConversation row ─────────────────────
  const conversation = await prisma.assistantConversation.upsert({
    where: {
      company_id_employee_id_channel: {
        company_id: link.company_id,
        employee_id: link.employee_id,
        channel: 'whatsapp',
      },
    },
    create: {
      company_id: link.company_id,
      employee_id: link.employee_id,
      channel: 'whatsapp',
      draft_json: { history: [], actionDraft: null },
      draft_expires_at: new Date(Date.now() + 30 * 60 * 1000),
    },
    update: {},
    select: { id: true },
  });

  // ── Step 12: Persist inbound message to audit trail ───────────────────────
  await prisma.assistantMessageRecord.create({
    data: {
      conversation_id: conversation.id,
      company_id: link.company_id,
      role: 'user',
      content: messageText,
    },
  });

  // ── Step 13: Run assistant turn (headless) ────────────────────────────────
  const reply = await respondHeadless(messageText, history, execCtx, actionDraft);

  // ── Step 14: Persist outbound reply to audit trail ────────────────────────
  await prisma.assistantMessageRecord.create({
    data: {
      conversation_id: conversation.id,
      company_id: link.company_id,
      role: 'assistant',
      content: reply.reply,
    },
  });

  // ── Step 15: Update conversation history + new draft state ───────────────
  const updatedHistory = [
    ...history,
    { role: 'user' as const, content: messageText },
    { role: 'assistant' as const, content: reply.reply },
  ];

  await saveConversationDraft(link.company_id, link.employee_id, 'whatsapp', {
    history: updatedHistory,
    actionDraft: reply.actionDraft ?? null,
  });

  // ── Step 16: Convert to WhatsApp messages and send ───────────────────────
  const outboundMessages = assistantReplyToWhatsAppMessages(reply);

  const sendResult = await sendWhatsAppMessages(
    outboundMessages,
    tenantConfig.phoneNumberId,
    fromWaId, // recipient wa_id
    tenantConfig.accessToken
  );

  // ── Step 17: Mark as processed in idempotency store ──────────────────────
  await markIdempotencyRecord(link.company_id, link.employee_id, idempotencyKey, {
    processed: true,
    sendAllOk: sendResult.allOk,
  }, 200, expiresAt);

  logChannelEvent('info', 'whatsapp_message_processed', {
    messageId,
    fromSuffix: fromWaId.slice(-4),
    sendAllOk: sendResult.allOk,
    replySource: reply.source,
    hasPendingAction: !!reply.pendingAction,
  });
  } catch (err) {
    await markIdempotencyRecord(link.company_id, link.employee_id, idempotencyKey, {
      processed: false,
      error: 'processing_failed',
    }, 500, expiresAt).catch(() => undefined);
    throw err;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function markIdempotencyRecord(
  companyId: string,
  employeeId: string,
  idempotencyKey: string,
  responseJson: Record<string, unknown>,
  httpStatus: number,
  expiresAt: Date
): Promise<void> {
  await prisma.idempotencyRecord.update({
    where: {
      company_id_employee_id_idempotency_key: {
        company_id: companyId,
        employee_id: employeeId,
        idempotency_key: idempotencyKey,
      },
    },
    data: {
      response_json: responseJson as Prisma.InputJsonValue,
      http_status: httpStatus,
      expires_at: expiresAt,
    },
  });
}

function extractMessageText(msg: MetaMessage): string | null {
  if (msg.type === 'text') {
    return msg.text.body.trim() || null;
  }
  if (msg.type === 'interactive') {
    // Button reply — return the button id ('confirm' or 'cancel')
    return msg.interactive.button_reply.id.trim() || null;
  }
  return null;
}

/** Always return 200 to prevent WhatsApp from retrying delivery. */
function ok200(): NextResponse {
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
