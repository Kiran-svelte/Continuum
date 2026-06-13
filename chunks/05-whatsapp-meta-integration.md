# Chunk 05 — WhatsApp / Meta Integration (Full Specification)

> **L5 internals:** [`l5/05-whatsapp-meta-L5.md`](./l5/05-whatsapp-meta-L5.md) — webhook GET/POST, Graph JSON, bot exact strings, WA-01..WA-15, admin connect API  
> **Status:** `blocked_until_gates` | **Depends on:** G1–G6 + Chunks 03, 04 | **Est.:** 15–20 dev-days

---

## L1 — Room purpose

**Room name:** Ambulance Entrance (WhatsApp Cloud API)  
**Business outcome:** Company admin connects Meta WhatsApp Business Account; employees message company number; verified users complete v1 HR actions in chat.  
**Revenue link:** Zero UI reduces friction → higher DAU → lower churn; WhatsApp can be tiered add-on ($X/seat/month) once stable.

**HARD BLOCK:** Do not implement until Chunk 08 sign-off GO.

---

## L2 — Meta external prerequisites (G6)

| Item | Owner | Evidence file |
|------|-------|---------------|
| Meta Business Manager verified | Customer/Ops | `docs/proofs/meta-waba-ready.md` |
| Developer App with WhatsApp product | Eng | App ID partial in proof |
| Test phone_number_id | Meta | proof doc |
| Webhook URL registered | Eng | screenshot description |
| App Secret in Vercel | Ops | not in git |
| Template `continuum_verify_code` approved | Ops | template name + language en |

---

## L3 — Environment variables (platform)

**File:** `web/.env.example` (add section)

```bash
WHATSAPP_APP_SECRET=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_API_VERSION=v21.0
WHATSAPP_BYPASS_SIGNATURE=false
WHATSAPP_TOKEN_ENCRYPTION_KEY=
NEXT_PUBLIC_WHATSAPP_ENABLED=false
```

| Variable | Scope | Never |
|----------|-------|-------|
| WHATSAPP_APP_SECRET | platform | client bundle |
| Per-tenant token | DB encrypted | env file |

**Do NOT use root `render_env_v2.json` secrets — rotate if ever committed.**

---

## C5-01 — Webhook route

**Create:** `web/app/api/webhooks/whatsapp/route.ts`  
**Methods:** GET, POST  
**dynamic:** `force-dynamic`

### GET — verification

| Query param | Expected |
|-------------|----------|
| `hub.mode` | `subscribe` |
| `hub.verify_token` | equals `process.env.WHATSAPP_VERIFY_TOKEN` |
| `hub.challenge` | echoed as plain text body |

| Result | HTTP |
|--------|------|
| match | 200 body = challenge |
| mismatch | 403 body = `Forbidden` |

### POST — inbound

| Step | Action |
|------|--------|
| 1 | Read raw body string before JSON parse |
| 2 | Verify `X-Hub-Signature-256` unless `WHATSAPP_BYPASS_SIGNATURE==='true'` (dev only) |
| 3 | Parse JSON — structure per Meta Cloud API |
| 4 | For each message in payload: dedupe → tenant → identity → assistant → send |
| 5 | Return 200 `{ success: true }` within 5 seconds |

**Reference payload shape (dev only):** repo root `debug_payload.json`

```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "field": "messages",
      "value": {
        "metadata": { "phone_number_id": "...", "display_phone_number": "..." },
        "contacts": [{ "wa_id": "...", "profile": { "name": "..." } }],
        "messages": [{ "from": "...", "id": "...", "type": "text", "text": { "body": "hi" } }]
      }
    }]
  }]
}
```

---

## C5-02 — Signature verification

**Create:** `web/lib/whatsapp/verify-signature.ts`

```typescript
export function verifyMetaWebhookSignature(params: {
  rawBody: string;
  signatureHeader: string | null; // "sha256=..."
  appSecret: string;
}): boolean
```

Algorithm: HMAC-SHA256(rawBody, appSecret), compare timing-safe to header hex

**Production CI gate:** fail build if `WHATSAPP_BYPASS_SIGNATURE=true` in production env template

---

## C5-03 — Graph API client

**Create:** `web/lib/whatsapp/graph-client.ts`

Base URL: `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`

### sendTextMessage

```typescript
POST body: {
  messaging_product: 'whatsapp',
  to: wa_id,
  type: 'text',
  text: { preview_url: false, body: string }
}
```

### sendInteractiveButtons

```typescript
type: 'interactive',
interactive: {
  type: 'button',
  body: { text: string },
  action: { buttons: [{ type: 'reply', reply: { id: string, title: string } }] }
}
```

### sendDocument

```typescript
type: 'document',
document: { link: signedUrl, filename: string, caption?: string }
```

### markAsRead

```typescript
POST { messaging_product: 'whatsapp', status: 'read', message_id: metaId }
```

**Retry policy:** 3 attempts, backoff 1s/2s/4s on 429/5xx

---

## C5-04 — Crypto for tenant tokens

**Create:** `web/lib/whatsapp/crypto.ts`

| Function | Spec |
|----------|------|
| `encryptToken(plain: string): string` | AES-256-GCM, random iv, auth tag, base64 payload |
| `decryptToken(cipher: string): string` | reverse |

Key: `WHATSAPP_TOKEN_ENCRYPTION_KEY` 32 bytes base64

---

## C5-05 — Inbound pipeline

**Create:** `web/lib/whatsapp/inbound-handler.ts`

```typescript
export async function handleWhatsAppInbound(event: ParsedInboundEvent): Promise<void>
```

**ParsedInboundEvent fields:**

| Field | Type |
|-------|------|
| phoneNumberId | string |
| waId | string |
| messageId | string |
| messageType | text \| interactive \| button \| image |
| textBody | string optional |
| buttonId | string optional |
| contactName | string optional |
| timestamp | number |

**Pipeline:**

```text
dedupe(messageId)
  → tenant = resolveTenantByPhoneNumberId(phoneNumberId)
  → if !tenant || !tenant.messagingEnabled → log, return
  → link = findByExternalId(tenant.companyId, 'whatsapp', waId)
  → if !link → verificationFlow(tenant, waId, textBody)
  → ctx = buildContextFromLink(link)
  → conv = getOrCreateConversation({ ...ctx, externalId: waId })
  → if STOP → optOut(waId)
  → reply = processAssistantTurn({ ctx, message: normalizedText, actionCommand from button })
  → outbound = assistantReplyToWhatsAppMessages(reply)
  → for each: graphClient.send*
  → markAsRead
```

---

## C5-06 — Dedupe

**Create:** `web/lib/whatsapp/dedupe.ts`

**Table:** `WhatsAppInboundMessage` (optional — or reuse message id in IdempotencyRecord)

```prisma
model WhatsAppInboundMessage {
  id           String   @id // Meta message.id
  company_id   String
  processed_at DateTime @default(now())
}
```

Insert before processing; unique violation → return immediately

---

## C5-07 — Admin connect UI

### Page

| Property | Value |
|----------|-------|
| Route | `/admin/integrations/whatsapp` |
| File | `web/app/admin/integrations/whatsapp/page.tsx` |
| Feature flag | `NEXT_PUBLIC_WHATSAPP_ENABLED` |
| Layout | `web/app/admin/(main)/layout.tsx` |

### UI states

| State | Visual | Primary CTA |
|-------|--------|-------------|
| disconnected | Gray status badge `var(--muted-foreground)` | "Connect WhatsApp Business" |
| connecting | Loader2 spinner | — |
| connected | Green badge, display phone | "Send test message", "Disconnect" |
| error | Destructive badge, last_error_code | "Reconnect" |

**Design tokens only:** background `var(--background)`, card `card` class, primary button `Button` variant default

### APIs

**Create:**

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/admin/integrations/whatsapp` | admin/hr | — | `{ status, displayPhoneE164, connectedAt, tokenPresent, messagingEnabled }` |
| POST | `/api/admin/integrations/whatsapp/connect` | admin | `{ wabaId, phoneNumberId, accessToken }` | `{ success: true }` |
| POST | `/api/admin/integrations/whatsapp/disconnect` | admin | — | `{ success: true }` |
| POST | `/api/admin/integrations/whatsapp/test` | admin | `{ toPhoneE164 }` | `{ messageId }` |
| PATCH | `/api/admin/integrations/whatsapp/settings` | admin | `{ messagingEnabled: boolean }` | `{ success: true }` |

**Never return `accessToken` in GET.**

**Connect validation:**

| Rule | Error |
|------|-------|
| phoneNumberId already bound other company | 409 `PHONE_NUMBER_IN_USE` |
| accessToken fails Graph API debug | 400 `INVALID_TOKEN` |

---

## C5-08 — Employee verification in WhatsApp

### Unknown wa_id flow

| Step | Bot message (exact) |
|------|---------------------|
| 1 | "Hi! I'm Continuum HR for {CompanyName}. I don't recognize this number yet." |
| 2 | If Employee.phone matches wa_id E.164 → send OTP template `continuum_verify_code` |
| 3 | If no match | "Ask HR to add your mobile number in Continuum, or link WhatsApp from your profile: {profileUrl}" |
| 4 | User sends 6 digits → `confirm` API → link created |
| 5 | "You're verified! Reply HELP to see what I can do." |

### Consent (first link)

```text
By continuing, you agree to receive work-related WhatsApp messages from {CompanyName}. Reply STOP to opt out.
```

### STOP

**Create:** `web/lib/whatsapp/opt-out.ts`

On `STOP` | `UNSUBSCRIBE`: revoke link, set preference, reply:

```text
You've been unsubscribed from WhatsApp HR messages. You can link again from your Continuum profile.
```

---

## C5-09 — Message templates (proactive)

| Template name | Variables | Trigger |
|---------------|-----------|---------|
| continuum_verify_code | {{1}} = OTP | verification |
| leave_approved | {{1}} name, {{2}} dates | dispatchNotification |
| leave_rejected | {{1}} name, {{2}} reason | dispatchNotification |
| approval_needed | {{1}} count | manager digest (optional) |

**24h session:** `web/lib/whatsapp/session-window.ts` — track `last_inbound_at` on conversation; outside window only templates

---

## C5-10 — E2E proof script

**Create:** `web/scripts/whatsapp-e2e-proof.ts`

| Step | Assert |
|------|--------|
| Admin connect API | WhatsAppTenantConfig.status=connected |
| Simulate webhook POST (dev bypass sig) | 200 |
| Unknown user → OTP path | challenge row created |
| Confirm OTP | ChannelIdentityLink row |
| Message "request leave" → flow → CONFIRM | LeaveRequest row |
| Outbound log | at least 2 messages sent |

Output: `docs/proofs/whatsapp-e2e-{timestamp}.md`

---

## Chunk 05 gate

| # | Check |
|---|-------|
| 1 | Real WhatsApp test thread completes leave request |
| 2 | Signature enforced in staging (no bypass) |
| 3 | Cross-tenant phone_number_id isolation |
| 4 | Admin connect/disconnect works |
| 5 | STOP opts out |
| 6 | e2e proof committed |

---

## Files summary

| Create | Path |
|--------|------|
| Route | `web/app/api/webhooks/whatsapp/route.ts` |
| Lib | `web/lib/whatsapp/*.ts` (8 files) |
| Admin page | `web/app/admin/integrations/whatsapp/page.tsx` |
| Admin APIs | `web/app/api/admin/integrations/whatsapp/**` |
| Script | `web/scripts/whatsapp-e2e-proof.ts` |

---

## Appendix A — Inbound message state machine

```text
                    ┌─────────────┐
                    │  WEBHOOK    │
                    │  POST recv  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
              no    │  Signature  │ yes
         ┌──────────│   valid?    │──────────┐
         │          └──────┬──────┘          │
         ▼                 │                 ▼
    HTTP 403          ┌────▼────┐        HTTP 403
                      │ Dedupe  │
                      │ msg id  │
                      └────┬────┘
                           │
              dup    ┌─────▼─────┐    new
         ┌───────────│  Known?   │────────────┐
         │           └───────────┘            │
         ▼                                    ▼
    HTTP 200                           ┌──────────────┐
    (no op)                            │ Resolve      │
                                       │ phone_number │
                                       │ _id → tenant │
                                       └──────┬───────┘
                                              │
                         null           ┌─────▼─────┐     found
                    ┌──────────────────│  Tenant   │────────────────┐
                    │                  └───────────┘                │
                    ▼                                                 ▼
              log unknown_tenant                              messaging_enabled?
              HTTP 200                                              │
                    │                                    false    │ true
                    │                              ┌──────────────┼──────────────┐
                    │                              ▼                             ▼
                    │                    reply disabled msg              ┌───────────────┐
                    │                    HTTP 200                      │ Resolve       │
                    │                                                    │ ChannelLink   │
                    │                                                    └───────┬───────┘
                    │                                                            │
                    │                                              missing         │ found
                    │                              ┌─────────────────────────────┼────────────────┐
                    │                              ▼                             ▼                │
                    │                    verification sub-flow              build ctx            │
                    │                    (OTP / HR message)                      │                │
                    │                              │                             ▼                │
                    │                              │                    processAssistantTurn       │
                    │                              │                             │                │
                    │                              │                             ▼                │
                    │                              │                    send outbound + mark read  │
                    │                              │                             │                │
                    └──────────────────────────────┴─────────────────────────────┴────────────────┘
                                                      HTTP 200
```

---

## Appendix B — Meta Graph API error handling

| HTTP | Meta error code | Meaning | User message | Retry |
|------|-----------------|---------|--------------|-------|
| 401 | 190 | Invalid OAuth token | "WhatsApp connection error. Admin: reconnect in Settings." | no — admin |
| 403 | 10 | Permission denied | same | no |
| 429 | 4, 80007 | Rate limit | "Too many messages. Wait a moment." | yes 3x |
| 400 | 131030 | Recipient not in allowed list (dev) | log only in dev | no |
| 400 | 131047 | Re-engagement message needed | send approved template | template |
| 500+ | — | Meta outage | "WhatsApp delivery delayed. Use web: {url}" | yes 3x |

Log all Graph errors with: `companyId`, `phoneNumberId`, `waId` (hashed), `metaErrorCode` — never log full request body

---

## Appendix C — Interactive button ID mapping

| Button reply id | Maps to assistant |
|-----------------|-------------------|
| `confirm` | `actionCommand: 'confirm'` |
| `cancel` | `actionCommand: 'cancel'` |
| `help` | message: `help` |
| `balance` | message: `check my leave balance` |
| `leave` | message: `request leave` |
| `clock_in` | message: `clock in` |
| `payslip` | message: `my payslip` |

**Max buttons per message:** 3 (WhatsApp limit)

---

## Appendix D — Template message specs (Meta Business Manager)

### continuum_verify_code

| Property | Value |
|----------|-------|
| Category | AUTHENTICATION |
| Language | en |
| Body | `Your Continuum verification code is {{1}}. Valid for 10 minutes. Do not share.` |
| {{1}} | 6-digit OTP |

### leave_approved

| Property | Value |
|----------|-------|
| Category | UTILITY |
| Body | `Hi {{1}}, your leave for {{2}} has been approved.` |
| {{1}} | first name |
| {{2}} | date range string |

### leave_rejected

| Body | `Hi {{1}}, your leave request was not approved. Reason: {{2}}` |

---

## Appendix E — Pricing / packaging (Product Owner)

| Tier | WhatsApp | Notes |
|------|----------|-------|
| Starter | Not included | Web only |
| Growth | Optional add-on | Requires G1–G6 + Chunk 05 MVP |
| Enterprise | Included | Dedicated WABA per tenant |

**Metering (future):** count outbound template messages per company per month in `UsageRecord` table

---

## Appendix F — Webhook test curl (dev only)

```bash
# Verification
curl "https://YOUR_DOMAIN/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=test123"

# Inbound simulate (BYPASS_WHATSAPP_SIGNATURE=true on dev only)
curl -X POST "https://YOUR_DOMAIN/api/webhooks/whatsapp" \
  -H "Content-Type: application/json" \
  -d @debug_payload.json
```

**Production:** never use bypass; compute valid `X-Hub-Signature-256` header

---

## Appendix G — Test cases (WhatsApp E2E)

| ID | Steps | Expected |
|----|-------|----------|
| WA-01 | Admin connect valid token | status=connected |
| WA-02 | Admin connect duplicate phone_number_id other tenant | 409 PHONE_NUMBER_IN_USE |
| WA-03 | Inbound hi unknown number | verification or HR message |
| WA-04 | OTP correct | ChannelIdentityLink created |
| WA-05 | OTP wrong 3x | CODE_LOCKED |
| WA-06 | Full leave + CONFIRM | LeaveRequest status pending/approved |
| WA-07 | Duplicate meta message id | single LeaveRequest |
| WA-08 | STOP | link revoked, no further replies |
| WA-09 | messaging_enabled=false | disabled message, no assistant |
| WA-10 | Invalid signature prod | 403, Sentry alert |
