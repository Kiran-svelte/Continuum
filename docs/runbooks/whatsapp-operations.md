# WhatsApp Operations Runbook

Chunk 05 remains blocked until pre-flight GO. These procedures are required before enabling Meta traffic.

## Webhook Not Receiving

Symptoms: Meta delivery failures, no `wa_inbound` logs, admin test message never appears.

Checks:

1. Verify challenge URL returns the challenge string.
2. Confirm `WHATSAPP_VERIFY_TOKEN` matches Meta.
3. Confirm middleware excludes `/api/webhooks/whatsapp`.
4. Confirm `messages` subscription is enabled in Meta.

Fix: rotate verify token in env and Meta together, redeploy, then re-test challenge.

Prevention: synthetic verify monitor every 5 minutes.

## Invalid Signature

Symptoms: 403 webhook responses or `wa_verify_fail` spike.

Checks:

1. `WHATSAPP_BYPASS_SIGNATURE` is false in production.
2. Raw body is used for HMAC verification.
3. `WHATSAPP_APP_SECRET` matches the Meta app secret.

Fix: update secret, redeploy, and ask user to resend if Meta cannot replay.

Prevention: CI blocks production bypass and raw body logging.

## Token Expired

Symptoms: admin page error state or Graph OAuth code 190.

Checks:

1. Admin settings show token present without exposing token.
2. One-off decrypt test succeeds.
3. Manual Graph GET works with decrypted token.

Fix: admin reconnects WhatsApp, token is encrypted, then send a test message.

Prevention: alert on first Graph 401 per company.

## Employee Not Verified

Symptoms: employee is always treated as unknown.

Checks:

1. `Employee.phone` is E.164.
2. `ChannelIdentityLink.external_id` is digits-only and active.
3. Company `WhatsAppTenantConfig.messaging_enabled` is true.
4. Employee status is active.
5. Number is not in `ChannelBlocklist`.

Fix: HR updates phone, employee verifies again, or duplicate phone ownership is resolved.

Prevention: phone save revokes stale links and verification checks duplicate active links.

## Duplicate Replies

Symptoms: one inbound message creates multiple bot replies.

Checks:

1. Inbound message ID dedupe exists before execution.
2. Service confirmation uses `IdempotencyRecord`.
3. Webhook returns 200 for duplicate delivery.

Fix: add missing unique index or idempotency call before re-enabling.

Prevention: keep message IDs and draft IDs as idempotency keys.

## Template Rejected

Symptoms: verify code template rejected or pending in Meta.

Checks: inspect template status, language, sample variables, and business policy reason.

Fix: edit template and wait for approval before G6.

Prevention: record approved template status in `meta-waba-ready.md`.

## Per-Tenant Debug

Queries:

```sql
SELECT id, company_id, phone_number_id, messaging_enabled, status
FROM "WhatsAppTenantConfig"
WHERE company_id = $1;

SELECT id, employee_id, external_id, phone_e164, verified_at, revoked_at, revoke_reason
FROM "ChannelIdentityLink"
WHERE company_id = $1 AND channel = 'whatsapp';

SELECT id, actor_id, action, entity_type, new_state, created_at
FROM "AuditLog"
WHERE company_id = $1 AND new_state->>'channel' = 'whatsapp'
ORDER BY created_at DESC
LIMIT 50;
```

Use read-only production access and a support ticket reference.
