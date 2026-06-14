# L5 — Chunk 05: WhatsApp / Meta Internals

> Parent: `../05-whatsapp-meta-integration.md`  
> **BLOCKED until G1–G6 PASS**

---

## L5-05-001 — Environment matrix

| Variable | Dev | Staging | Production |
|----------|-----|---------|------------|
| WHATSAPP_APP_SECRET | test app | staging app | prod app |
| WHATSAPP_VERIFY_TOKEN | random string | random | random |
| WHATSAPP_BYPASS_SIGNATURE | true | false | **false** |
| WHATSAPP_API_VERSION | v21.0 | v21.0 | v21.0 |
| WHATSAPP_TOKEN_ENCRYPTION_KEY | dev 32-byte key | unique | unique |
| NEXT_PUBLIC_WHATSAPP_ENABLED | true | true | true |

---

## L5-05-002 — Webhook GET handler (exact code contract)

```typescript
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? '', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
  return new NextResponse('Forbidden', { status: 403 });
}
```

---

## L5-05-003 — Signature verification

```typescript
import crypto from 'crypto';

export function verifyMetaWebhookSignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!signatureHeader?.startsWith('sha256=')) return false;
  const expected = crypto.createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
  const received = signatureHeader.slice(7);
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
}
```

**POST handler first lines:**

```typescript
const rawBody = await request.text();
if (process.env.WHATSAPP_BYPASS_SIGNATURE !== 'true') {
  if (!verifyMetaWebhookSignature(rawBody, request.headers.get('x-hub-signature-256'), process.env.WHATSAPP_APP_SECRET!)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }
}
const json = JSON.parse(rawBody);
```

---

## L5-05-004 — Graph API send text (exact JSON)

**URL:** `POST https://graph.facebook.com/v21.0/{phone-number-id}/messages`

**Headers:**

```http
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Body:**

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "919876543210",
  "type": "text",
  "text": {
    "preview_url": false,
    "body": "Your leave request has been submitted."
  }
}
```

**Success 200:**

```json
{ "messaging_product": "whatsapp", "contacts": [{ "input": "...", "wa_id": "..." }], "messages": [{ "id": "wamid.xxx" }] }
```

---

## L5-05-005 — Admin connect API

### POST /api/admin/integrations/whatsapp/connect

**Auth:** primary_role admin OR hr; permission company.edit_settings recommended

**Body:**

```json
{
  "wabaId": "123456789",
  "phoneNumberId": "1090528010807708",
  "accessToken": "EAAxxxxx"
}
```

**Validation steps:**

1. Validate token: GET graph `/v21.0/{phoneNumberId}` with token → must 200
2. Check phoneNumberId not used by other company → else 409 `{ error: { code: 'PHONE_NUMBER_IN_USE', message: 'This WhatsApp number is already connected to another company.' } }`
3. encryptToken(accessToken) → store WhatsAppTenantConfig
4. status = 'connected', connected_at = now()

### GET /api/admin/integrations/whatsapp

**Response 200:**

```json
{
  "status": "connected",
  "displayPhoneE164": "+91 95159 51642",
  "connectedAt": "2026-06-13T10:00:00.000Z",
  "tokenPresent": true,
  "messagingEnabled": true,
  "lastErrorCode": null
}
```

---

## L5-05-006 — Bot message scripts (exact strings)

### Unknown number

```text
Hi! I'm Continuum HR for {companyName}.

I don't recognize this WhatsApp number yet.

If you're an employee, ask HR to add your mobile number in Continuum, or sign in and link WhatsApp from your profile:
{profileUrl}
```

### OTP sent

```text
We found your account. Your verification code is sent to this chat.

Reply with the 6-digit code within 10 minutes.
```

### OTP wrong

```text
That code isn't correct. You have {remaining} attempt(s) left.
```

### Verified welcome

```text
You're connected to {companyName} HR on WhatsApp.

By continuing, you agree to receive work-related messages. Reply STOP to opt out.

Reply HELP to see what I can do.
```

### STOP confirmation

```text
You've been unsubscribed from WhatsApp HR messages for {companyName}. You can link again from your Continuum profile anytime.
```

### Messaging disabled (kill switch)

```text
WhatsApp HR is temporarily unavailable for {companyName}. Please use Continuum on the web:
{appUrl}
```

---

## L5-05-007 — Meta templates

### continuum_verify_code

| Property | Value |
|----------|-------|
| Category | AUTHENTICATION |
| Language | en |
| Body | Your Continuum verification code is {{1}}. Valid for 10 minutes. |

### leave_approved

| Property | Value |
|----------|-------|
| Category | UTILITY |
| Body | Hi {{1}}, your leave for {{2}} has been approved. |

---

## L5-05-008 — E2E tests WA-01 to WA-15

| ID | Steps | Assert |
|----|-------|--------|
| WA-01 | Admin connect | WhatsAppTenantConfig.status=connected |
| WA-02 | Duplicate phone_number_id | 409 |
| WA-03 | Webhook verify GET | 200 challenge |
| WA-04 | Inbound hi unknown | verification message |
| WA-05 | OTP correct | ChannelIdentityLink row |
| WA-06 | OTP wrong 3x | CODE_LOCKED |
| WA-07 | HELP | role menu text |
| WA-08 | Full leave CONFIRM | LeaveRequest created |
| WA-09 | Duplicate message id | one LeaveRequest |
| WA-10 | STOP | link revoked |
| WA-11 | messaging_enabled false | disabled message |
| WA-12 | Invalid signature prod | 403 |
| WA-13 | Payslip request | document or link outbound |
| WA-14 | Graph 429 | retries 3x |
| WA-15 | Cross-tenant phone_number_id | no data leak |

---

## L5-05-009 — Inbound parse field map

**File:** `web/lib/whatsapp/parse-inbound.ts`

| JSON path | Field |
|-----------|-------|
| entry[0].changes[0].value.metadata.phone_number_id | phoneNumberId |
| entry[0].changes[0].value.messages[0].from | waId |
| entry[0].changes[0].value.messages[0].id | messageId |
| entry[0].changes[0].value.messages[0].type | type |
| entry[0].changes[0].value.messages[0].text.body | textBody |
| entry[0].changes[0].value.messages[0].interactive.button_reply.id | buttonId |

**Ignore:** status updates, reactions, unsupported types → 200 ack no reply

---

## L5-05-010 — File manifest

| Path | Exports |
|------|---------|
| web/app/api/webhooks/whatsapp/route.ts | GET, POST |
| web/lib/whatsapp/graph-client.ts | sendTextMessage, sendInteractiveButtons, sendDocument, markAsRead |
| web/lib/whatsapp/verify-signature.ts | verifyMetaWebhookSignature |
| web/lib/whatsapp/parse-inbound.ts | parseInboundWebhook |
| web/lib/whatsapp/inbound-handler.ts | handleWhatsAppInbound |
| web/lib/whatsapp/dedupe.ts | isDuplicateMessage, markProcessed |
| web/lib/whatsapp/opt-out.ts | handleStop, isOptedOut |
| web/lib/whatsapp/session-window.ts | isInsideSessionWindow |
| web/app/admin/integrations/whatsapp/page.tsx | default export page |
| web/app/api/admin/integrations/whatsapp/connect/route.ts | POST |
| web/scripts/whatsapp-e2e-proof.ts | main |

---

## L5-05-PART-B — Inbound handler state machine

```text
[Webhook POST]
  → verify signature
  → parse inbound
  → dedupe messageId? → 200 ack (no op)
  → resolve tenant by phone_number_id
  → messaging_enabled? → disabled template → 200
  → blocklist check? → 200 silent
  → STOP keyword? → revoke link → STOP confirm
  → HELP keyword? → role menu
  → resolve ChannelIdentityLink by waId
      → none: start OTP flow OR unknown number script
      → verified: buildContextFromLink → processAssistantTurn
  → adapter outbound messages
  → graph send (retry 3x)
  → mark processed
  → 200 ack (<5s total)
```

---

## L5-05-PART-C — Graph API interactive buttons JSON

```json
{
  "messaging_product": "whatsapp",
  "to": "919876543210",
  "type": "interactive",
  "interactive": {
    "type": "button",
    "body": { "text": "Confirm leave submission?" },
    "action": {
      "buttons": [
        { "type": "reply", "reply": { "id": "confirm", "title": "Confirm" } },
        { "type": "reply", "reply": { "id": "cancel", "title": "Cancel" } }
      ]
    }
  }
}
```

**Inbound button_reply.id** maps to actionCommand confirm/cancel

---

## L5-05-PART-D — Graph API retry policy

| HTTP from Meta | Action |
|----------------|--------|
| 429 | exponential backoff 1s, 2s, 4s — max 3 attempts |
| 5xx | retry 3x |
| 400 template | log lastErrorCode, admin UI error state |
| 401 token | status error, notify admin reconnect |

**Do not retry** on 400 invalid recipient

---

## L5-05-PART-E — Session window (24h rule)

**File:** `web/lib/whatsapp/session-window.ts`

- Free-form messages allowed within 24h of last inbound user message  
- Outside window: use approved template for outbound (except OTP template during verify)  
- `isInsideSessionWindow(waId, companyId)` checks AssistantMessageRecord last user msg

---

## L5-05-PART-F — OTP flow state machine

| State | Inbound | Outbound |
|-------|---------|----------|
| unknown | any text | unknown number script |
| employee found no link | hi | OTP sent script + template |
| awaiting_otp | 6 digits | verify → welcome OR wrong |
| verified | any | processAssistantTurn |
| locked | any | CODE_LOCKED message |

---

## L5-05-PART-G — Admin disconnect API

**DELETE /api/admin/integrations/whatsapp**

| Step | Action |
|------|--------|
| 1 | Auth admin/hr |
| 2 | Delete or null WhatsAppTenantConfig tokens |
| 3 | status → disconnected |
| 4 | Optional: revoke all ChannelIdentityLink for company channel whatsapp |
| 5 | Audit WHATSAPP_DISCONNECTED |

---

## L5-05-PART-H — Send test message API

**POST /api/admin/integrations/whatsapp/test**

**Body:** `{ "toWaId": "919876543210" }` — must match admin's own linked phone in staging

**Sends:** "Continuum test message — WhatsApp HR is connected."

---

## L5-05-PART-I — whatsapp-e2e-proof.ts steps

| Step | Action |
|------|--------|
| 1 | Admin connect via API |
| 2 | Simulate webhook verify GET |
| 3 | POST signed inbound unknown |
| 4 | POST signed inbound OTP |
| 5 | POST signed inbound HELP |
| 6 | POST signed inbound leave flow |
| 7 | Assert DB rows + audit |
| 8 | Write docs/proofs/whatsapp-e2e-{timestamp}.md |

---

## L5-05-PART-J — Extended WA tests WA-16 – WA-25

| ID | Test |
|----|------|
| WA-16 | button confirm id=confirm |
| WA-17 | button cancel |
| WA-18 | session window template fallback |
| WA-19 | markAsRead called |
| WA-20 | admin disconnect |
| WA-21 | test message API |
| WA-22 | LINK token from web |
| WA-23 | concurrent duplicate webhooks |
| WA-24 | malformed JSON 400 |
| WA-25 | phone_number_id unknown tenant 200 ack |
