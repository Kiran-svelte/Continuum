# WhatsApp Logging Policy

## Purpose

Define safe logging, storage, third-party transmission, and retention for WhatsApp HR channel operations. This applies to Chunk 05 once unblocked and to pre-flight channel verification now.

## Classification

| Class | Examples | Log to console | Store DB | Sentry |
|-------|----------|----------------|----------|--------|
| PUBLIC | `messageId`, `phone_number_id`, `companyId` | yes | yes | yes |
| SENSITIVE | `waId`, `employeeId` | hash only | yes | hash tag |
| RESTRICTED | message body, OTP, access token | never raw | encrypted or hashed only | never |
| SECRET | app secret, token encryption key | never | never | never |

## Allowed Log Fields

Allowed webhook/channel fields are `event`, `ts`, `companyId`, `phoneNumberId`, `messageId`, `waIdHash`, `messageType`, `processingMs`, and `errorCode`.

## Forbidden Patterns

- `console.log(rawBody`
- `console.log(inbound`
- Raw `text.body`
- Full `Authorization` or `Cookie` headers
- Decrypted `access_token_enc`

## Retention

| Data | Retention | Purge |
|------|-----------|-------|
| `AssistantMessageRecord.content` | `portal_policy.messaging.chat_retention_days`, default 90 | `POST /api/internal/purge-chat-history` |
| WhatsApp inbound raw payload | 30 days after processing | same cron after Chunk 05 table exists |
| Audit log metadata | 7 years | no automatic purge |

## STOP And Opt-Out

On STOP, revoke `ChannelIdentityLink`, write `CHANNEL_LINK_REVOKED`, and preserve historical audit metadata.

## Review Cadence

Review webhook, graph client, safe logger, and Sentry scrub code quarterly and before Chunk 05 merge.
