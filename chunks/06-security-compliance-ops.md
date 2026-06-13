# Chunk 06 — Security, Compliance & Operations (Full Specification)

> **Status:** `not_started` | **Depends on:** Chunk 03 (parallel with 04) | **Est.:** 5–8 dev-days  
> **L5 (implement from):** [`l5/06-security-ops-L5.md`](./l5/06-security-ops-L5.md)

---

## L1 — Room purpose

**Room name:** Safety Inspector Office  
**Business outcome:** Regulators and enterprise buyers trust Continuum with PII on WhatsApp; ops team can detect and fix failures without reading employee chat contents.  
**Revenue link:** One WhatsApp data leak = lost enterprise deals; audit trail = required for ISO/SOC sales.

---

## C6-01 — Audit trail extension

### Current audit

**File:** `web/lib/audit.ts`  
**Function:** `createAuditLog({ companyId, actorId, action, entityType, entityId, newState })`  
**Assistant today:** `entityType: 'assistant_action'`, `newState.source: 'continuum_assistant'`

### Required newState schema (exact keys)

```typescript
{
  source: 'continuum_assistant' | 'whatsapp' | 'web_assistant';
  channel: 'web' | 'whatsapp';
  external_message_id?: string | null;
  action_kind: string;
  draft_id?: string | null;
  result: 'confirmed' | 'cancelled' | 'failed';
  error?: string | null;
  payload_summary: Record<string, unknown>;
  idempotency_key?: string | null;
}
```

**Create:** `web/lib/channel/audit-channel-action.ts`

Wraps `createAuditLog` — called from every `*Service` execute path in Chunk 03

### Audit actions mapping

| Service action | AUDIT_ACTIONS constant |
|----------------|------------------------|
| leave submit | `LEAVE_SUBMIT` |
| leave approve | `LEAVE_APPROVE` |
| leave reject | `LEAVE_REJECT` |
| leave cancel | existing or add `LEAVE_CANCEL` |
| attendance clock | add `ATTENDANCE_CLOCK` if missing |
| channel verify | add `CHANNEL_VERIFY` |

### Admin UI filter

**File:** `web/app/admin/(main)/audit-logs/page.tsx`  
**API:** `GET /api/audit-logs?channel=whatsapp&entity_type=assistant_action`

**UI control:** Select filter "Channel: All | Web | WhatsApp"

---

## C6-02 — PII logging policy

**Create:** `web/docs/WHATSAPP_LOGGING_POLICY.md`

| Data element | Application logs | Sentry | DB |
|--------------|------------------|--------|-----|
| Full message body | NEVER | NEVER | AssistantMessageRecord only (encrypted at rest per Neon) |
| wa_id | last 4 digits | SHA-256 hash | ChannelIdentityLink.external_id |
| OTP code | NEVER | NEVER | bcrypt hash only |
| access_token | NEVER | NEVER | access_token_enc only |
| employee email | yes (info) | yes | yes |
| companyId | yes | yes | yes |

**Create:** `web/lib/log/safe-logger.ts`

```typescript
export function logChannelEvent(
  level: 'info' | 'warn' | 'error',
  event: string,
  meta: Record<string, unknown>
): void
```

Auto-redact keys: `text`, `body`, `password`, `token`, `code`, `accessToken`

**CI grep gate:**

```powershell
rg "console\.(log|debug)" web/app/api/webhooks web/lib/whatsapp web/lib/channel
```

Must return 0 in production paths (use safe-logger)

---

## C6-03 — Secrets management

### Classification table

| Secret | Storage | Rotation |
|--------|---------|----------|
| WHATSAPP_APP_SECRET | Vercel prod env | Meta app dashboard |
| WHATSAPP_VERIFY_TOKEN | Vercel | manual |
| WHATSAPP_TOKEN_ENCRYPTION_KEY | Vercel | re-encrypt all tenant tokens |
| Tenant access token | WhatsAppTenantConfig.access_token_enc | admin reconnect |

### Admin API response whitelist

GET `/api/admin/integrations/whatsapp` — allowed keys only:

```typescript
['status', 'displayPhoneE164', 'connectedAt', 'tokenPresent', 'messagingEnabled', 'lastErrorCode']
```

**Forbidden keys in any JSON response:** `accessToken`, `access_token`, `token`, `secret`

### Repo hygiene

Ensure `.gitignore` includes `render_env*.json`, `.env`, `.env.local`  
**Action:** audit root `render_env_v2.json` — remove from tracking if committed; rotate exposed tokens

---

## C6-04 — Abuse controls

### Rate limits (implement in Chunk 03 — verify here)

| Bucket | Limit | User message |
|--------|-------|--------------|
| channel:whatsapp:emp:{id} | 30/min | "Too many messages. Please wait a moment and try again." |
| channel:verify:phone:{e164} | 5/hour | "Too many verification attempts. Try again in an hour." |

### Company kill switch

**Field:** `WhatsAppTenantConfig.messaging_enabled`  
**Admin UI:** toggle on `/admin/integrations/whatsapp`  
**PATCH API:** `/api/admin/integrations/whatsapp/settings`

When false:

- Webhook returns 200 to Meta
- User receives: "WhatsApp HR is temporarily unavailable for {Company}. Please use Continuum on the web: {url}"
- Web app unaffected

### Blocklist

```prisma
model ChannelBlocklist {
  id          String   @id @default(uuid())
  company_id  String
  channel     String
  external_id String
  reason      String?
  created_by  String?
  created_at  DateTime @default(now())
  @@unique([company_id, channel, external_id])
}
```

Check before processing inbound — silent ack if blocked

### OTP brute force

**File:** `web/lib/channel/phone-verify.ts`

| Rule | Behavior |
|------|----------|
| max_attempts = 3 | lock challenge |
| max challenges per phone per hour = 5 | HTTP 429 |

---

## C6-05 — Monitoring & alerting

### Sentry

**File:** `web/lib/sentry-config.ts` — add tags: `channel`, `companyId`, `whatsapp.phone_number_id`

### Metrics (log-based or Betterstack)

| Metric name | Alert if |
|-------------|----------|
| whatsapp.webhook.signature_fail | > 10 / 5 min |
| whatsapp.send.failure_rate | > 5% / 15 min |
| whatsapp.unknown_tenant | > 0 sustained 10 min |
| assistant.action.failed | > 10 / 5 min per company |

### Public status

**Optional:** `web/app/api/status/public/route.ts` add field:

```json
{ "whatsapp_delivery": "operational" | "degraded" | "outage" }
```

---

## C6-06 — Data retention & GDPR

### Retention defaults

**Store in:** `CompanySettings.portal_policy.messaging`:

```json
{
  "chat_retention_days": 90,
  "require_employee_phone": false,
  "whatsapp_opt_in_required": true
}
```

**Cron:** `POST /api/internal/purge-chat-history`  
**Auth:** `CRON_SECRET` header  
**Deletes:** `AssistantMessageRecord` older than retention; `WhatsAppInboundMessage` older than 30 days

### Employee offboard

On `Employee.status → terminated`:

1. `revokeChannelLinksForEmployee(id, 'terminated')`
2. Schedule conversation purge within 24h

### GDPR export

If export exists (`web/app/api/**/export`), include:

- ChannelIdentityLink (no tokens)
- AssistantMessageRecord for employee

---

## C6-07 — Disaster recovery

**Update:** `docs/DISASTER_RECOVERY_PLAN.md` — add section:

| Table | RPO | Notes |
|-------|-----|-------|
| ChannelIdentityLink | same as Postgres | re-verify if lost |
| WhatsAppTenantConfig | same | admin reconnect if tokens lost |
| AssistantConversation | same | chat history loss acceptable with notice |

**DR test:** disable WhatsApp → web leave submit still 201

---

## C6-08 — Compliance checklist (pre-launch)

| # | Item | Owner |
|---|------|-------|
| 1 | Privacy policy mentions WhatsApp | Legal |
| 2 | Employee opt-in consent message | Product |
| 3 | STOP opt-out works | Eng |
| 4 | Retention policy documented | Product |
| 5 | No message bodies in Sentry | Eng |
| 6 | Meta Data Processing Terms | Legal |

---

## Chunk 06 gate

| # | Check |
|---|-------|
| 1 | Audit row for WhatsApp leave with channel field |
| 2 | safe-logger used in webhook path |
| 3 | Kill switch stops replies |
| 4 | Rate limit triggers in test |
| 5 | DR doc updated |
| 6 | WHATSAPP_LOGGING_POLICY.md approved |

---

## Files summary

| Action | Path |
|--------|------|
| Create | `web/lib/channel/audit-channel-action.ts` |
| Create | `web/lib/log/safe-logger.ts` |
| Create | `web/docs/WHATSAPP_LOGGING_POLICY.md` |
| Create | `web/app/api/internal/purge-chat-history/route.ts` |
| Modify | `web/lib/audit.ts` |
| Modify | `web/lib/sentry-config.ts` |
| Modify | `docs/DISASTER_RECOVERY_PLAN.md` |
| Modify | `web/app/admin/(main)/audit-logs/page.tsx` |

---

## Appendix A — Audit log query examples (support)

```sql
-- WhatsApp assistant actions last 24h for company
SELECT id, actor_id, action, entity_id, new_state, created_at
FROM "AuditLog"
WHERE company_id = $1
  AND entity_type = 'assistant_action'
  AND new_state->>'channel' = 'whatsapp'
  AND created_at > now() - interval '24 hours'
ORDER BY created_at DESC;
```

**Support must NOT query** `AssistantMessageRecord.content` unless legal hold + customer approval

---

## Appendix B — Incident severity matrix

| Severity | Condition | Response SLA | Example |
|----------|-----------|--------------|---------|
| SEV1 | Cross-tenant data in webhook reply | 1 hour | employee A sees company B leave balance |
| SEV1 | Token leaked in API response | 1 hour | GET returns accessToken |
| SEV2 | WhatsApp down >30 min all tenants | 4 hours | Graph API 500 sustained |
| SEV2 | Signature fail spike | 4 hours | wrong APP_SECRET deploy |
| SEV3 | Single tenant disconnect | 1 business day | expired token |
| SEV4 | OTP rate limit false positive | 2 business days | tuning |

---

## Appendix C — safe-logger redaction rules (implementation)

```typescript
const REDACT_KEYS = new Set([
  'text', 'body', 'message', 'password', 'token', 'accessToken',
  'access_token', 'code', 'otp', 'authorization', 'cookie',
]);

function redactMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (REDACT_KEYS.has(k.toLowerCase())) {
      out[k] = '[REDACTED]';
    } else if (k === 'waId' && typeof v === 'string') {
      out[k] = v.slice(-4).padStart(v.length, '*');
    } else {
      out[k] = v;
    }
  }
  return out;
}
```

---

## Appendix D — Security test cases

| ID | Test | Expected |
|----|------|----------|
| SEC-01 | GET whatsapp admin API as employee | 403 |
| SEC-02 | Webhook POST without signature (prod) | 403 |
| SEC-03 | Verify start for other company phone | no cross-link |
| SEC-04 | Headless ctx tenant A + request B uuid | 403 |
| SEC-05 | Audit log tamper chain verify | integrity test pass |
| SEC-06 | Purge cron deletes old messages | count decreases |
| SEC-07 | Terminated employee inbound WA | verification required |
| SEC-08 | Blocklisted wa_id | 200 ack, no reply |

---

## Appendix E — Legal copy placeholders (Product/Legal to finalize)

**Privacy policy addition:**

> When your employer enables WhatsApp HR, Continuum processes your WhatsApp ID and message content to perform HR actions you request. Messages are retained for {retention_days} days. Reply STOP to opt out.

**Admin terms checkbox on connect:**

> I confirm I have authority to connect this WhatsApp Business number and inform employees of WhatsApp HR messaging.

---

## Appendix F — Ops dashboard metrics (future)

| Widget | Query source |
|--------|--------------|
| Messages in/out 24h | count webhook + send logs |
| Verification success rate | challenges consumed / started |
| Action success rate | audit result=confirmed / total |
| Failed sends | whatsapp.send.failure metric |

**Not in pre-flight MVP** — log metrics only; dashboard optional post-launch
