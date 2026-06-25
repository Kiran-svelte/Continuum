/**
 * WhatsApp outbound message sender.
 *
 * Sends messages via Meta WhatsApp Cloud API v19.0.
 * - Maps WhatsAppOutbound union to the Cloud API JSON format
 * - Never throws — returns per-message results
 * - Access token used only in Authorization header, never logged
 *
 * Implements G6 Zero UI outbound gate (L5-03-004).
 *
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages
 */
import type { WhatsAppOutbound } from '@/lib/continuum-assistant/adapters/whatsapp';
import { logChannelEvent } from '@/lib/whatsapp/safe-logger';

const CLOUD_API_VERSION = 'v19.0';

/** Result of a single message send attempt. */
export interface SendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

/** Combined result of sending all outbound messages for one reply. */
export interface SendBatchResult {
  allOk: boolean;
  results: SendResult[];
}

/**
 * Sends an array of WhatsApp outbound messages to a single recipient.
 *
 * @param messages      - Messages produced by `assistantReplyToWhatsAppMessages`.
 * @param phoneNumberId - Meta phone_number_id for the tenant's sending number.
 * @param to            - Recipient WhatsApp phone number (E.164 format, no +).
 * @param accessToken   - Decrypted tenant access token (from `getWhatsAppTenantConfig`).
 * @returns Batch result with per-message ok/error status.
 */
export async function sendWhatsAppMessages(
  messages: WhatsAppOutbound[],
  phoneNumberId: string,
  to: string,
  accessToken: string
): Promise<SendBatchResult> {
  const url = `https://graph.facebook.com/${CLOUD_API_VERSION}/${phoneNumberId}/messages`;

  const results: SendResult[] = await Promise.all(
    messages.map((msg) => sendSingleMessage(url, msg, to, accessToken))
  );

  const allOk = results.every((r) => r.ok);

  logChannelEvent(
    allOk ? 'info' : 'warn',
    'whatsapp_send_batch',
    {
      phoneNumberId,
      to: `***${to.slice(-4)}`,   // last 4 digits only
      messageCount: messages.length,
      allOk,
      failureCount: results.filter((r) => !r.ok).length,
    }
  );

  return { allOk, results };
}

// ─── Private Helpers ─────────────────────────────────────────────────────────

async function sendSingleMessage(
  url: string,
  msg: WhatsAppOutbound,
  to: string,
  accessToken: string
): Promise<SendResult> {
  const body = buildCloudApiBody(msg, to);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown');
      return { ok: false, error: `HTTP ${res.status}: ${errText.slice(0, 200)}` };
    }

    const data = (await res.json()) as { messages?: Array<{ id?: string }> };
    const messageId = data.messages?.[0]?.id;
    return { ok: true, messageId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network error' };
  }
}

/**
 * Converts our `WhatsAppOutbound` union to Meta Cloud API message body.
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/messages/interactive-reply-buttons
 */
function buildCloudApiBody(
  msg: WhatsAppOutbound,
  to: string
): Record<string, unknown> {
  if (msg.type === 'text') {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body: msg.text, preview_url: false },
    };
  }

  // interactive_buttons → Cloud API "interactive" message with reply buttons
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: msg.text.slice(0, 1024) }, // Cloud API limit
      action: {
        buttons: msg.buttons.map((btn) => ({
          type: 'reply',
          reply: {
            id: btn.id,
            title: btn.title.slice(0, 20), // Cloud API title limit
          },
        })),
      },
    },
  };
}
