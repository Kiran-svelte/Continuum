# L5-DEEP — Chunk 06: Security & Ops (Exhaustive)

> Companion to [`../06-security-ops-L5.md`](../06-security-ops-L5.md) — **Level 5 operational depth**

---

## DEEP-06-001 — WHATSAPP_LOGGING_POLICY.md (full document text)

**Path:** `web/docs/WHATSAPP_LOGGING_POLICY.md`

### 1. Purpose

Define what may be logged, stored, transmitted to third parties (Sentry, Better Stack), and retained for WhatsApp HR channel operations.

### 2. Classification

| Class | Examples | Log to console | Store DB | Sentry |
|-------|----------|----------------|----------|--------|
| PUBLIC | messageId, phone_number_id, companyId | yes | yes | yes |
| SENSITIVE | waId (hash only), employeeId | hash | yes | hash tag |
| RESTRICTED | message body, OTP, access_token | never raw | encrypted/hashed only | never |
| SECRET | WHATSAPP_APP_SECRET, encryption key | never | never | never |

### 3. Allowed log fields

```typescript
interface AllowedWebhookLog {
  event: 'wa_inbound' | 'wa_outbound' | 'wa_verify_fail' | 'wa_graph_error';
  ts: string;
  companyId?: string;
  phoneNumberId?: string;
  messageId?: string;
  waIdHash?: string; // sha256(waId + salt)
  messageType?: 'text' | 'interactive' | 'button';
  processingMs?: number;
  errorCode?: string;
}
```

### 4. Forbidden patterns (CI grep ban)

- `console.log(rawBody`
- `console.log(inbound`
- `JSON.stringify(body)` where body contains `.text.body`
- Logging full `Authorization` header
- Logging `access_token_enc` decrypted value outside graph-client.ts

### 5. Retention

| Data | Retention | Purge mechanism |
|------|-----------|-----------------|
| AssistantMessageRecord.content | portal_policy.messaging.chat_retention_days (default 90) | purge-chat-history cron |
| WhatsAppInboundMessage raw payload | 30 days processed_at | same cron |
| AuditLog newState | 7 years | no auto purge |
| Application logs (Vercel) | 30 days | platform default |

### 6. Third-party processors

| Vendor | Data sent | DPA required |
|--------|-----------|--------------|
| Meta | message content in transit | WhatsApp Business Terms |
| Sentry | scrubbed errors only | yes |
| Neon Postgres | encrypted at rest | yes |

### 7. Employee STOP / opt-out

On STOP: revoke ChannelIdentityLink, log CHANNEL_LINK_REVOKED, do not delete AuditLog historical entries.

### 8. Review cadence

Quarterly security review of webhook route + graph-client.ts for logging regressions.

---

## DEEP-06-002 — Runbook: Webhook not receiving

**File section:** `docs/runbooks/whatsapp-operations.md#webhook-not-receiving`

### Symptoms

- Meta console shows webhook delivery failures
- No `wa_inbound` logs in staging
- Admin test message never arrives

### Checks

1. Confirm public URL: `GET https://{host}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token={token}&hub.challenge=test` returns `test`
2. Verify `WHATSAPP_VERIFY_TOKEN` matches Meta App Dashboard → WhatsApp → Configuration
3. Check Vercel deployment protection — webhook must bypass auth middleware
4. Confirm middleware matcher excludes `/api/webhooks/whatsapp`
5. Inspect Meta webhook subscription fields: `messages` subscribed
6. curl POST with valid signature from staging secret

### Fix

- Rotate verify token in env + Meta console simultaneously
- Redeploy after env change
- Re-subscribe webhook via Meta API if needed

### Prevention

- Add synthetic monitor: daily GET verify challenge from UptimeRobot

---

## DEEP-06-003 — Runbook: Invalid signature

### Symptoms

- 403 responses in webhook logs
- `wa_verify_fail` metric spike

### Checks

1. `WHATSAPP_BYPASS_SIGNATURE` must be `false` in production
2. Raw body must be read via `request.text()` before JSON parse — not `request.json()`
3. `WHATSAPP_APP_SECRET` matches Meta App → Settings → Basic
4. App secret not confused with access token
5. No middleware modifies body before verification

### Fix

- Update APP_SECRET in Vercel production env
- Redeploy
- Replay failed events from Meta if applicable (usually not — user must resend)

---

## DEEP-06-004 — Runbook: Token expired / Graph 401

### Symptoms

- Admin UI shows error state
- `wa_graph_error` with OAuthException code 190

### Checks

1. GET admin settings — tokenPresent true but sends fail
2. Test decrypt: `decryptToken(config.access_token_enc, key)` in one-off script
3. Manual Graph GET `/v21.0/{phone_number_id}` with decrypted token

### Fix

1. Admin → Reconnect WhatsApp → paste new long-lived token from Meta Business Suite
2. Verify encrypt stores new ciphertext
3. Send test message

### Prevention

- Document token refresh cadence (60-day Meta system user tokens)
- Alert on first Graph 401 per company

---

## DEEP-06-005 — Runbook: Employee not verified

### Symptoms

- Employee sends WhatsApp message → unknown number script every time
- OTP never arrives

### Checks

1. `Employee.phone` E.164 matches WhatsApp number
2. `ChannelIdentityLink` row: revoked_at null, external_id = digits-only phone
3. `WhatsAppTenantConfig.messaging_enabled` true
4. Employee status active, org_id matches tenant
5. Not on ChannelBlocklist

### Fix

- HR updates phone in admin people table
- Employee completes verify flow OR LINK token from profile
- If duplicate link on another employee — resolve HR data conflict first

---

## DEEP-06-006 — Runbook: Duplicate bot replies

### Symptoms

- Two identical leave confirmations for one user message

### Checks

1. `WhatsAppInboundMessage.message_id` unique constraint
2. dedupe.ts called before processAssistantTurn
3. IdempotencyRecord for draft.id on confirm

### Fix

- Add unique index on message_id if missing
- Ensure webhook returns 200 quickly even on duplicate (idempotent ack)

---

## DEEP-06-007 — SQL debug queries (per tenant)

```sql
-- Tenant config
SELECT id, company_id, phone_number_id, messaging_enabled, status, connected_at, last_error_code
FROM "WhatsAppTenantConfig"
WHERE company_id = $1;

-- Links for company
SELECT id, employee_id, external_id, phone_e164, verified_at, revoked_at, revoke_reason
FROM "ChannelIdentityLink"
WHERE company_id = $1 AND channel = 'whatsapp';

-- Recent channel audits
SELECT id, actor_id, action, entity_type, new_state, created_at
FROM "AuditLog"
WHERE company_id = $1
  AND new_state->>'channel' = 'whatsapp'
ORDER BY created_at DESC
LIMIT 50;

-- Pending verification
SELECT id, employee_id, expires_at, attempts, max_attempts
FROM "ChannelVerificationChallenge"
WHERE company_id = $1 AND consumed_at IS NULL;
```

**Never run in production without read-only role and ticket reference.**

---

## DEEP-06-008 — Compliance mapping (SOC2-style controls)

| Control ID | Description | Implementation | Evidence |
|------------|-------------|----------------|----------|
| CC6.1 | Logical access | RBAC on admin WhatsApp APIs | SEC-01, SEC-13 |
| CC6.6 | Encryption | AES-256-GCM tokens | SEC-10 |
| CC7.2 | Monitoring | Sentry + logChannelEvent | SEC-04, SEC-17 |
| CC7.3 | Incident response | SEV matrix L5-06-006 | runbook |
| P4.1 | Privacy notice | Legal copy L5-06-008 | privacy page |
| P4.3 | Retention | purge cron L5-06-005 | SEC-07 |

---

## DEEP-06-009 — Production deployment checklist (security)

- [ ] WHATSAPP_BYPASS_SIGNATURE=false
- [ ] WHATSAPP_TOKEN_ENCRYPTION_KEY unique per env, 32 bytes base64
- [ ] CRON_SECRET set for purge endpoint
- [ ] Webhook route excluded from auth middleware
- [ ] Sentry DSN configured with scrub hook
- [ ] No test phone tokens in production env
- [ ] Meta app in Live mode only after G6
- [ ] Rate limits enabled on verify endpoints
- [ ] Kill switch tested in staging
- [ ] Blocklist admin UI or SQL procedure documented

---

## DEEP-06-010 — Security review gate (before Chunk 05 merge)

| Reviewer | Checklist item | Sign |
|----------|----------------|------|
| Eng | Signature verification uses timingSafeEqual | |
| Eng | No raw message in logs (grep CI) | |
| Eng | Tenant isolation HE-05 PASS | |
| Legal | Privacy addendum published | |
| Product | STOP/HELP copy approved | |
| Ops | Runbooks uploaded to docs/runbooks | |

---

## DEEP-06-011 — Extended SEC tests SEC-21 – SEC-40

| ID | Given | When | Then |
|----|-------|------|------|
| SEC-21 | prod env | BYPASS true | CI fails deploy gate |
| SEC-22 | webhook | missing signature header | 403 |
| SEC-23 | graph-client | log on error | no token in log line |
| SEC-24 | admin | GET settings response | no access_token field |
| SEC-25 | employee A | inbound on company B number | no data from B |
| SEC-26 | OTP brute force | 4th attempt | CODE_LOCKED |
| SEC-27 | purge cron | messages 91 days old | deleted |
| SEC-28 | audit | assistant whatsapp action | source=whatsapp |
| SEC-29 | kill switch | inbound during draft | draft cleared, disabled msg |
| SEC-30 | blocklist | inbound from blocked waId | 200 no reply |
| SEC-31 | terminated | active link | inbound no processing |
| SEC-32 | phone change | profile PUT | link revoked_at set |
| SEC-33 | Sentry | thrown webhook error | no text.body in event |
| SEC-34 | cron | wrong bearer | 401 |
| SEC-35 | encrypt | wrong key decrypt | throws, no leak |
| SEC-36 | dual key rotation | re-encrypt job | all rows readable |
| SEC-37 | DR drill | restore DB snapshot | links intact or re-verify doc |
| SEC-38 | pen test | forged employeeId in body | ignored — uses link only |
| SEC-39 | Meta replay | same message_id 2× | one execution |
| SEC-40 | independence | WA off globally | web leave 201 |

---

## DEEP-06-012 — File manifest (Chunk 06)

| Op | Path |
|----|------|
| CREATE | web/lib/logging/safe-logger.ts |
| CREATE | web/lib/whatsapp/sentry-scrub.ts |
| CREATE | web/app/api/internal/purge-chat-history/route.ts |
| CREATE | web/docs/WHATSAPP_LOGGING_POLICY.md |
| MODIFY | web/lib/audit.ts — AUDIT_ACTIONS extensions |
| MODIFY | docs/DISASTER_RECOVERY_PLAN.md — channel tables section |
| MODIFY | docs/SECURITY_AND_COMPLIANCE.md — WhatsApp addendum link |
| CREATE | web/tests/security-channel.test.ts — SEC-01–20 |

---

## DEEP-06-013 — safe-logger unit test cases

| Input meta | Expected output |
|------------|-----------------|
| `{ text: 'hello' }` | `{ text: '[REDACTED]' }` |
| `{ messageId: 'wamid.x' }` | unchanged |
| `{ nested: { password: 'x' } }` | nested redacted |
| `{ authorization: 'Bearer x' }` | redacted |

---

## DEEP-06-014 — Vercel middleware exclusion snippet

```typescript
export const config = {
  matcher: [
    '/((?!api/webhooks/whatsapp|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

Verify webhook path not caught by auth redirect.

---

## DEEP-06-015 — Better Stack / UptimeRobot monitors

| Monitor | URL | Interval |
|---------|-----|----------|
| Webhook verify | GET challenge endpoint | 5 min |
| App health | GET /api/health | 1 min |
| Staging smoke | manual weekly | prod-smoke script |

Alert route: on-call Slack/email per docs/OPERATIONS_READINESS_20.md
