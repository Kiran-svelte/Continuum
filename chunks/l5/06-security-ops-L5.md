# L5 — Chunk 06: Security & Ops Internals

> Parent: `../06-security-compliance-ops.md`

---

## L5-06-001 — Audit newState JSON schema

Every channel action audit via `createAuditLog`:

```typescript
{
  companyId: string;
  actorId: string; // employeeId
  action: string; // AUDIT_ACTIONS.*
  entityType: 'assistant_action';
  entityId: string; // leave request id or draft id
  newState: {
    source: 'continuum_assistant' | 'whatsapp' | 'web_assistant';
    channel: 'web' | 'whatsapp';
    external_message_id: string | null;
    action_kind: string;
    draft_id: string | null;
    result: 'confirmed' | 'cancelled' | 'failed';
    error: string | null;
    payload_summary: {
      leave_type?: string;
      start_date?: string;
      end_date?: string;
      request_id?: string;
    };
    idempotency_key: string | null;
  };
}
```

---

## L5-06-002 — safe-logger implementation

```typescript
const REDACT_KEYS = new Set([
  'text', 'body', 'message', 'password', 'token', 'accesstoken',
  'access_token', 'code', 'otp', 'authorization', 'cookie', 'secret',
]);

export function logChannelEvent(level: 'info'|'warn'|'error', event: string, meta: Record<string, unknown>) {
  const safe = redactMeta(meta);
  console[level](JSON.stringify({ ts: new Date().toISOString(), event, ...safe }));
}
```

**Forbidden in webhook:** `console.log(inboundBody)` — use `logChannelEvent('info', 'wa_inbound', { messageId, companyId, waIdHash })`

---

## L5-06-003 — Kill switch behavior

**Field:** `WhatsAppTenantConfig.messaging_enabled`

**When false:**

1. Webhook still returns 200 to Meta within 5s
2. If known employee sends message → single outbound: disabled template (L5-05-006)
3. No processAssistantTurn execution
4. logChannelEvent warn `wa_messaging_disabled`

**Admin PATCH body:** `{ "messagingEnabled": false }`

---

## L5-06-004 — ChannelBlocklist

```prisma
model ChannelBlocklist {
  id          String   @id @default(uuid())
  company_id  String
  channel     String   // 'whatsapp'
  external_id String
  reason      String?
  created_by  String?
  created_at  DateTime @default(now())
  @@unique([company_id, channel, external_id])
}
```

**Check before identity resolution** — if blocked: 200 ack, no reply, audit `CHANNEL_BLOCKED`

---

## L5-06-005 — Retention cron

**Route:** `POST /api/internal/purge-chat-history`

**Header:** `Authorization: Bearer ${CRON_SECRET}`

**Logic:**

```typescript
const days = company.portal_policy.messaging.chat_retention_days ?? 90;
await prisma.assistantMessageRecord.deleteMany({
  where: { created_at: { lt: subDays(now, days) } }
});
await prisma.whatsAppInboundMessage.deleteMany({
  where: { processed_at: { lt: subDays(now, 30) } }
});
```

---

## L5-06-006 — SEV matrix

| SEV | Condition | Response | Notify |
|-----|-----------|----------|--------|
| SEV1 | Cross-tenant data in reply | disable messaging all tenants, incident bridge | immediate |
| SEV1 | Token in API response | rotate tokens, hotfix | immediate |
| SEV2 | Graph API down >30m | status degraded | on-call |
| SEV2 | signature_fail >10/5m | check APP_SECRET deploy | on-call |
| SEV3 | Single tenant disconnect | admin reconnect docs | next business day |

---

## L5-06-007 — SEC test catalog

| ID | Test |
|----|------|
| SEC-01 | GET whatsapp settings as employee → 403 |
| SEC-02 | Webhook POST bad signature prod → 403 |
| SEC-03 | Audit contains channel=whatsapp after WA action |
| SEC-04 | Sentry event has no message body field |
| SEC-05 | Kill switch → no assistant execution |
| SEC-06 | Blocklist → no reply |
| SEC-07 | Purge cron deletes old messages |
| SEC-08 | Terminated employee → link revoked |

---

## L5-06-008 — Legal copy (finalize with Legal)

**Privacy addendum paragraph:** When employer enables WhatsApp HR, Continuum processes WhatsApp ID, phone, and message content to perform requested HR actions. Retained {N} days. STOP to opt out.

**Admin connect checkbox label:** "I confirm I am authorized to connect this WhatsApp Business number and will inform employees."

---

## L5-06-009 — DR addition

**File:** `docs/DISASTER_RECOVERY_PLAN.md` section to add:

| Table | RPO | Recovery action |
|-------|-----|-----------------|
| ChannelIdentityLink | Postgres PITR | employees re-verify if lost |
| WhatsAppTenantConfig | Postgres PITR | admin reconnect if tokens lost |
| AssistantMessageRecord | Postgres PITR | acceptable loss with notice |
| IdempotencyRecord | Postgres PITR | safe to truncate |

**Web independence test:** WhatsAppTenantConfig.messaging_enabled=false globally → POST /api/leaves/submit still 201

---

## L5-06-PART-B — Channel API RBAC matrix

| Endpoint | admin | hr | employee | manager |
|----------|-------|-----|----------|---------|
| GET /api/admin/integrations/whatsapp | ✓ | ✓ | ✗ | ✗ |
| POST connect | ✓ | ✓ | ✗ | ✗ |
| DELETE disconnect | ✓ | ✓ | ✗ | ✗ |
| POST /api/webhooks/whatsapp | public Meta | — | — | — |
| POST /api/channel/verify/start | ✓ self | ✓ self | ✓ self | ✓ self |
| POST /api/channel/verify/confirm | ✓ self | ✓ self | ✓ self | ✓ self |
| POST /api/internal/purge-chat-history | cron secret only | — | — | — |

---

## L5-06-PART-C — Rate limit catalog (channel)

| Bucket | Limit | Window |
|--------|-------|--------|
| webhook/{phone_number_id} | 1000 | 1 min |
| graph-send/{companyId} | 60 | 1 min |
| assistant/{employeeId} | 30 | 1 min |
| verify-start/{employeeId} | 3 | 1 hour |

---

## L5-06-PART-D — Sentry scrubbing rules

**Before captureException:**

- Strip request.body.text.body  
- Strip OTP codes  
- Hash waId in tags  
- Never attach access_token_enc

**File:** `web/lib/whatsapp/sentry-scrub.ts`

---

## L5-06-PART-E — GDPR / data subject requests

| Request type | Action |
|--------------|--------|
| Export | include ChannelIdentityLink, AssistantMessageRecord for employee |
| Delete | revoke link, purge messages, retain audit metadata 7y |
| Opt-out STOP | immediate revoke, no marketing templates |

---

## L5-06-PART-F — Incident runbook triggers

| Alert name | Query | Threshold |
|------------|-------|-----------|
| wa_signature_fail_spike | signature_fail count | >10/5m |
| wa_graph_error_rate | graph 5xx | >5% 15m |
| wa_cross_tenant_suspect | audit org mismatch | any 1 |

---

## L5-06-PART-G — AUDIT_ACTIONS extensions

| Action constant | When |
|-----------------|------|
| CHANNEL_LINK_CREATED | verify confirm success |
| CHANNEL_LINK_REVOKED | STOP, phone change, terminate |
| WHATSAPP_CONNECTED | admin connect |
| WHATSAPP_DISCONNECTED | admin disconnect |
| ASSISTANT_ACTION | all processAssistantTurn executes |

---

## L5-06-PART-H — Extended SEC tests SEC-09 – SEC-20

| ID | Test |
|----|------|
| SEC-09 | cron purge without secret 401 |
| SEC-10 | encrypt/decrypt roundtrip |
| SEC-11 | token never in GET settings JSON |
| SEC-12 | webhook timing attack safeEqual |
| SEC-13 | employee cannot POST connect |
| SEC-14 | audit immutable — no UPDATE |
| SEC-15 | terminated employee inbound 200 no reply |
| SEC-16 | cross-company external_id isolation |
| SEC-17 | logChannelEvent redacts body |
| SEC-18 | Sentry scrub unit test |
| SEC-19 | blocklist silent ack |
| SEC-20 | DR web leave works WA disabled |
