# L5-DEEP — Chunk 04: Assistant Expansion (Exhaustive)

> Companion to [`../04-assistant-expansion-L5.md`](../04-assistant-expansion-L5.md)  
> **Master Gate G4**

---

## DEEP-04-001 — processAssistantTurn full signature

```typescript
export async function processAssistantTurn(input: {
  ctx: AssistantExecutionContext;
  message: string;
  actionCommand?: 'confirm' | 'cancel';
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<AssistantReply>;
```

**Must NOT accept:** actionDraft from client (server loads draft from DB)

---

## DEEP-04-002 — Draft kinds enum (v1)

```typescript
type DraftKind =
  | 'request_leave'
  | 'cancel_leave'
  | 'approve_leave'
  | 'reject_leave'
  | 'clock_in'
  | 'clock_out';
```

Each kind maps to handler in `web/lib/continuum-assistant/actions/handlers/`

---

## DEEP-04-003 — A1 date parsing rules

| User phrase | Parsed start_date (IST) |
|-------------|-------------------------|
| tomorrow | today+1 |
| next Monday | next occurence |
| 2026-07-01 | literal |
| today | today dateKey |
| July 1 | current year July 1 |

**Library:** use existing date util or `chrono-node` if already in package.json — do not add heavy dep without approval

---

## DEEP-04-004 — A6 approve leave multi-turn

```
User: approve leave for Priya
Bot: I found a pending request: CL Jul 1–2 (2 days). Reply CONFIRM to approve or CANCEL.
User: CONFIRM
Bot: Approved. Priya's leave is approved.
```

**Draft payload:** `{ requestId: string, action: 'approve' }`  
**Service:** approveLeaveService

---

## DEEP-04-005 — A4 cancel leave multi-turn

```
User: cancel my leave next week
Bot: Found pending CL Jul 7–8. CONFIRM cancel?
User: yes
Bot: Leave request cancelled.
```

---

## DEEP-04-006 — Role help menu (HELP intent)

**File:** `web/lib/continuum-assistant/role-menu.ts`

| Role | Menu lines |
|------|------------|
| employee | request leave, balance, my leaves, clock in/out, payslip |
| manager | + pending approvals, approve/reject |
| hr | + view team tools (read-only in v1) |

**Format WhatsApp:**

```text
Continuum HR — Available commands:
• Request leave
• Check balance
• Clock in / Clock out
• Payslip
Reply with what you need, or ask in plain English.
```

---

## DEEP-04-007 — Insight handlers (A10)

| Handler | Query | Reply template |
|---------|-------|----------------|
| team-leave-today | approved leaves overlapping today team scope | "{n} team members on leave today: ..." |
| my-stats | pending count + balance summary | "You have {p} pending and {b} CL days left." |

Read-only — no draft, no confirm

---

## DEEP-04-008 — LLM respond.ts guardrails

**System message includes:**

- Employee name, role, company name
- Enabled modules list
- "Never fabricate balances or approval outcomes"
- "Always route mutations through draft+confirm"

**If LLM suggests action:** convert to draft collecting state, not direct execute

---

## DEEP-04-009 — Widget UI states

| State | UI |
|-------|-----|
| closed | FAB only |
| open idle | panel + input |
| loading | typing indicator |
| pendingAction | yellow banner + Confirm/Cancel buttons |
| actionResult success | green inline alert 5s |
| actionResult error | red inline alert |

---

## DEEP-04-010 — ZERO_UI_V1_ACTIONS.md — A2 balance section

### Example phrases (10+)

1. leave balance
2. how many CL left
3. check my balance
4. remaining sick leave
5. PL available
6. show balances
7. how much leave do I have
8. CL remaining
9. balance for casual leave
10. what's my leave quota

### Success reply

```text
Your leave balances ({year}):
• CL: 8 available (2 used, 1 pending)
• SL: 5 available
```

---

## DEEP-04-011 — Conversation retention

- Max 40 messages per conversation — prune oldest  
- Max history sent to LLM: 12 turns  
- Draft TTL: 15 minutes from last update

---

## DEEP-04-012 — Tests C04-T21 – C04-T40

| ID | Test |
|----|------|
| C04-T21 | HELP intent manager extra lines |
| C04-T22 | A3 list leaves empty |
| C04-T23 | A4 cancel wrong id |
| C04-T24 | A6 reject requires reason if policy |
| C04-T25 | A7 clock out without in error message |
| C04-T26 | A8 today not checked in |
| C04-T27 | A9 payslip no file friendly msg |
| C04-T28 | insight read-only no audit mutate |
| C04-T29 | LLM fallback link contains portalSlug |
| C04-T30 | hybrid source when LLM+rules |
| C04-T31 | message max 2000 truncate or 400 |
| C04-T32 | history max 12 enforced |
| C04-T33 | draft merge partial payload |
| C04-T34 | cancel regex "stop" |
| C04-T35 | confirm regex "✅" |
| C04-T36 | whatsapp adapter bold conversion |
| C04-T37 | split 4096 char at newline |
| C04-T38 | pendingAction buttons id confirm |
| C04-T39 | server draft reload after 5 min idle |
| C04-T40 | G4 doc exists all A1-A10 sections |

---

## DEEP-04-013 — File manifest Chunk 04

| Op | Path |
|----|------|
| CREATE | engine/process-turn.ts |
| CREATE | state/conversation-store.ts |
| CREATE | actions/handlers/*.ts |
| MODIFY | api/ai/assistant/route.ts — remove client draft trust |
| MODIFY | continuum-assistant-widget.tsx — server draft UX |
| CREATE | web/docs/ZERO_UI_V1_ACTIONS.md |
| CREATE | tests/continuum-assistant-v1-headless.test.ts |
