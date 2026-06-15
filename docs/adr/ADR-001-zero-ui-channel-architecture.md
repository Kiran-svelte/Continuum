# ADR-001 - Zero UI Channel Architecture

Status: Accepted for pre-flight candidate

## Context

Continuum needs WhatsApp-first HR actions without browser cookies. The existing web assistant and web routes cannot be treated as the only execution path because WhatsApp webhooks do not carry `continuum-access` session cookies.

## Decision

Use a shared service layer under `web/lib/services/*`, authenticated by either a web session context or a verified `ChannelIdentityLink`. Assistant confirmations call services directly through `AssistantExecutionContext`. Channel verification stores revocable links scoped by company, employee, channel, and external ID.

## Consequences

Positive: one business engine serves web assistant, future WhatsApp, and HTTP routes; RBAC and module gates remain shared.

Negative: routes must stay thin and service tests must cover behavior that used to live inside HTTP handlers.

## Alternatives Rejected

- Separate WhatsApp bot repository: rejected because RBAC, module gates, and leave policy logic would diverge.
- HTTP cookie forwarding from assistant: rejected because channel webhooks have no browser session and this hides tenant identity risk.
- RPA/Playwright over web UI: rejected because it is brittle and not auditable enough for HR actions.

## References

- `chunks/l5/03-api-channel-ready-L5.md`
- `chunks/l5/04-assistant-expansion-L5.md`
- `chunks/l5/08-testing-gates-L5.md`
