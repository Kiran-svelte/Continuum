# Chunk 04 — AI Assistant Expansion (Full Specification)

> **Status:** `not_started` | **Gate:** `pending` | **Depends on:** Chunk 03 | **Master Gate:** **G4**  
> **L5 (implement from):** [`l5/04-assistant-expansion-L5.md`](./l5/04-assistant-expansion-L5.md)

---

## L1 — Room purpose

**Room name:** Nurse Station (Continuum Guide / Zero UI Brain)  
**Business outcome:** One orchestrator answers employees on **web widget and WhatsApp** with identical business logic, confirm-before-execute, and v1 action coverage.  
**Revenue link:** "AI HR assistant" is a differentiator in sales demos; if web assistant only does 3 leave actions, WhatsApp cannot sell as full Zero UI.

---

## L2 — Current vs target

| Aspect | Current | Target |
|--------|---------|--------|
| Entry API | `POST /api/ai/assistant` | same + internal `processAssistantTurn` |
| Auth | JWT session | session OR `ChannelIdentityLink` |
| State | `sessionStorage` in widget | Postgres `AssistantConversation` |
| Actions | request/approve/reject leave | v1 catalog A1–A10 (see 00-INDEX) |
| Execute | cookie HTTP forward | service layer Chunk 03 |

**Current files:**

| File | Role |
|------|------|
| `web/app/api/ai/assistant/route.ts` | HTTP entry |
| `web/lib/continuum-assistant/respond.ts` | LLM + routing |
| `web/lib/continuum-assistant/actions/orchestrator.ts` | action state machine |
| `web/lib/continuum-assistant/actions/request-leave.ts` | leave draft |
| `web/lib/continuum-assistant/actions/approve-leave.ts` | approve/reject draft |
| `web/lib/continuum-assistant/actions/permissions.ts` | RBAC |
| `web/lib/continuum-assistant/action-types.ts` | draft types |
| `web/components/assistant/continuum-assistant-widget.tsx` | FAB UI |
| `web/docs/CONTINUUM_GUIDE_ACTIONS.md` | v1 doc (leave only) |

---

## L3 — Prisma: conversation state (Level 5)

```prisma
model AssistantConversation {
  id              String   @id @default(uuid())
  company_id      String
  employee_id     String
  channel         String   // 'web' | 'whatsapp'
  external_id     String?  // wa_id when whatsapp
  last_inbound_at DateTime?
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  messages        AssistantMessageRecord[]
  draft           AssistantActionDraftRecord?

  Company         Company  @relation(...)
  Employee        Employee @relation(...)

  @@unique([company_id, employee_id, channel])
  @@index([company_id, channel, external_id])
}

model AssistantMessageRecord {
  id               String   @id @default(uuid())
  conversation_id  String
  role             String   // 'user' | 'assistant'
  content          String   @db.Text
  created_at       DateTime @default(now())

  conversation     AssistantConversation @relation(...)

  @@index([conversation_id, created_at])
}

model AssistantActionDraftRecord {
  id               String   @id @default(uuid())
  conversation_id  String   @unique
  kind             String
  status           String   // 'collecting' | 'awaiting_confirmation'
  payload_json     Json
  expires_at       DateTime
  updated_at       DateTime @updatedAt

  conversation     AssistantConversation @relation(...)
}
```

**TTL:** 15 minutes — match `web/docs/CONTINUUM_GUIDE_ACTIONS.md`

---

## C4-01 — Unified engine

**Create:** `web/lib/continuum-assistant/engine/process-turn.ts`

```typescript
export interface ProcessTurnInput {
  ctx: AssistantExecutionContext;
  message: string;
  actionCommand?: 'confirm' | 'cancel';
  history?: AssistantMessage[]; // if omitted, load from DB
}

export async function processAssistantTurn(input: ProcessTurnInput): Promise<AssistantReply>
```

**Processing order (exact):**

1. Load conversation + draft from `conversation-store.ts`
2. If draft expired → clear, prepend expiry message
3. If `actionCommand === 'cancel'` OR message matches cancel regex → clear draft, return cancel reply
4. If `actionCommand === 'confirm'` OR (draft.status === 'awaiting_confirmation' AND confirm regex) → execute service for draft.kind
5. If active draft collecting → merge message into draft payload, return next prompt or awaiting_confirmation
6. Run insight intents (`insights/handlers.ts`) — read-only
7. Detect new action intents (leave, attendance, payslip, balance, list)
8. General LLM fallback with nav hints (`knowledge.ts`, `respond.ts`)
9. Out-of-scope → `fallback.ts`

**Confirm regex:**

```typescript
/^(confirm|yes|y|ok|okay|✅|proceed|submit)$/i
```

**Cancel regex:**

```typescript
/^(cancel|no|n|stop|abort|❌|discard)$/i
```

---

## C4-02 — Conversation store

**Create:** `web/lib/continuum-assistant/state/conversation-store.ts`

| Function | Spec |
|----------|------|
| `getOrCreateConversation(ctx)` | upsert on `(company_id, employee_id, channel)`; set `external_id` if whatsapp |
| `loadDraft(conversationId)` | null if expired (also delete record) |
| `saveDraft(conversationId, draft)` | upsert `AssistantActionDraftRecord`, `expires_at = now + 15min` |
| `clearDraft(conversationId)` | delete draft row |
| `appendMessages(conversationId, userText, assistantText)` | insert 2 rows; prune to last 40 messages |
| `getRecentHistory(conversationId, limit=12)` | for LLM context |
| `touchInbound(conversationId)` | update `last_inbound_at` for WhatsApp 24h window |

---

## C4-03 — Extend action types

**Modify:** `web/lib/continuum-assistant/action-types.ts`

```typescript
export type AssistantActionKind =
  | 'request_leave'
  | 'approve_leave'
  | 'reject_leave'
  | 'cancel_leave'
  | 'clock_in'
  | 'clock_out';

export interface AssistantReply {
  reply: string;
  links: Array<{ label: string; href: string }>;
  suggestions: string[];
  source: 'rules' | 'llm' | 'hybrid';
  actionDraft?: AssistantActionDraft | null;
  pendingAction?: {
    kind: AssistantActionKind;
    summaryText: string;
    expiresAt: string;
  } | null;
  actionResult?: { executed: boolean; success: boolean; message: string; entityId?: string };
}
```

---

## C4-04 — v1 action handlers (each spec)

### A1 — request_leave (migrate)

**File:** `web/lib/continuum-assistant/actions/request-leave.ts`  
**Intent regex examples:** `/request.*leave/i`, `/apply.*leave/i`, `/sick leave/i`, `/casual leave/i`  
**Permission:** `canUseAssistantAction(ctx, 'request_leave')` → needs `leave.apply_own`  
**Module:** `assertModule(orgId, 'leave')`

**Multi-turn collection fields:**

| Field | Prompt if missing | Parser |
|-------|-------------------|--------|
| `leave_type` | "Which leave type? (e.g. CL, SL)" | `parse-leave-input.ts` |
| `start_date` | "Start date? (YYYY-MM-DD or 'tomorrow')" | natural language |
| `end_date` | "End date?" | defaults to start if single day |
| `reason` | "Reason for leave?" | free text min 3 chars |

**Before confirm:** call constraint plain English via `insights/constraint-plain-english.ts`

**Confirm summary template (WhatsApp):**

```text
Leave request summary:
Type: {type}
Dates: {start} – {end} ({days} day(s))
Reason: {reason}

Reply CONFIRM to submit or CANCEL to discard.
Expires in 15 minutes.
```

**Execute:** `submitLeaveService(ctx, payload)` with idempotency key from draft.id

---

### A2 — check_balance (new)

**Create:** `web/lib/continuum-assistant/actions/check-balance.ts`  
**Intents:** `/balance/i`, `/how many.*leave/i`, `/remaining.*leave/i`  
**Permission:** `leave.apply_own`  
**Execute:** `getLeaveBalancesService(ctx)` — no confirm

**Reply template:**

```text
Your leave balances ({year}):
• Casual (CL): {remaining} remaining ({used} used, {pending} pending)
• Sick (SL): ...
```

---

### A3 — list_leaves (new)

**Create:** `web/lib/continuum-assistant/actions/list-leaves.ts`  
**Intents:** `/my leaves/i`, `/leave history/i`, `/pending leave/i`  
**Execute:** `listOwnLeavesService(ctx, { limit: 5, status: optional })`

---

### A4 — cancel_leave (new)

**Create:** `web/lib/continuum-assistant/actions/cancel-leave.ts`  
**Draft kind:** `cancel_leave`  
**Flow:** list cancellable pending → user picks by number or id → confirm → `cancelLeaveService`

---

### A5/A6 — approve/reject (migrate)

**File:** `web/lib/continuum-assistant/actions/approve-leave.ts`  
**Permissions:** `leave.approve_team` OR `leave.approve_any`  
**Execute:** `approveLeaveService` / `rejectLeaveService`

---

### A7/A8 — attendance (new)

**Create:** `web/lib/continuum-assistant/actions/attendance.ts`

| Intent | Action |
|--------|--------|
| clock in, check in, punch in | draft `clock_in` → confirm → `clockAttendanceService({ action: 'check_in' })` |
| clock out, check out | draft `clock_out` → confirm |
| am I checked in, today attendance | `getTodayAttendanceService` — no confirm |

**Errors relayed:** "Already checked in today." as-is from service

---

### A9 — payslip (new)

**Create:** `web/lib/continuum-assistant/actions/payslip.ts`  
**Intents:** `/payslip/i`, `/salary slip/i`  
**Module:** payroll  
**Execute:** `getLatestPayslipService(ctx)`

**Web reply:** link to `/{portalSlug}/payslips`  
**WhatsApp reply (Chunk 05):** document message with signed URL

---

## C4-05 — Web widget changes

**File:** `web/components/assistant/continuum-assistant-widget.tsx`

| Change | Detail |
|--------|--------|
| Remove | `DRAFT_STORAGE_KEY` sessionStorage read/write |
| Keep | FAB drag position localStorage (UX only) |
| API POST body | include `actionDraft` from last response only |
| Confirm button | sends `{ actionCommand: 'confirm', message: 'confirm' }` |
| Cancel button | sends `{ actionCommand: 'cancel', message: 'cancel' }` |
| Error display | `data.error.message` from API |

**Widget visibility:** hidden for `super_admin` — matches route 403 in `assistant/route.ts` line 58–62

---

## C4-06 — API route refactor

**File:** `web/app/api/ai/assistant/route.ts`

**Existing body schema (keep):**

```typescript
message: string min 1 max 2000
actionCommand: 'confirm' | 'cancel' optional
actionDraft: { id uuid, kind enum, status enum, payload, createdAt, expiresAt } optional
history: max 12 messages optional
```

**New flow:**

```typescript
const employee = await getAuthEmployee(request);
const ctx = await contextFromSession(employee);
const conv = await getOrCreateConversation(ctx);
const history = parsed.data.history ?? await getRecentHistory(conv.id);
const reply = await processAssistantTurn({ ctx, message, actionCommand, history });
await appendMessages(conv.id, message, reply.reply);
if (reply.actionDraft) await saveDraft(conv.id, reply.actionDraft);
else await clearDraft(conv.id);
return NextResponse.json(reply);
```

**Rate limit:** existing `checkApiRateLimit(employee.id, 'general')` — 429 message "Too many requests. Please wait a moment."

---

## C4-07 — WhatsApp adapter

**Create:** `web/lib/continuum-assistant/adapters/whatsapp.ts`

```typescript
export type WhatsAppOutbound =
  | { type: 'text'; text: string }
  | { type: 'interactive_buttons'; text: string; buttons: { id: string; title: string }[] }
  | { type: 'document'; url: string; filename: string; caption?: string };

export function assistantReplyToWhatsAppMessages(reply: AssistantReply): WhatsAppOutbound[]
```

**Rules:**

| Condition | Behavior |
|-----------|----------|
| `reply.reply` length > 4096 | split into multiple text messages at paragraph boundaries |
| `pendingAction` set | append buttons: Confirm (id=confirm), Cancel (id=cancel) |
| `suggestions.length <= 3` | optional quick replies |
| Markdown `**bold**` | convert to WhatsApp `*bold*` |

---

## C4-08 — Fallback & menus

**Create:** `web/lib/continuum-assistant/fallback.ts`

**Template:**

```text
I can't perform "{action}" in chat yet.

Open Continuum: {absoluteUrl}

Or reply HELP for what I can do here.
```

**Create:** `web/lib/continuum-assistant/menus/role-menu.ts`

**Employee HELP menu:**

```text
I can help with:
1. Request leave
2. Check leave balance
3. My leave requests
4. Clock in / out
5. Today's attendance
6. Latest payslip

What would you like to do?
```

**Manager adds:** "7. Pending approvals"

---

## C4-09 — Documentation G4

**Create:** `web/docs/ZERO_UI_V1_ACTIONS.md`

For **each action A1–A10**, document:

| Section | Content |
|---------|---------|
| Example phrases | min 10 variants |
| Required permission | code from rbac.ts |
| Module slug | from catalog |
| Multi-turn script | user/bot lines |
| Confirm text | exact |
| Success text | exact |
| Error texts | map from service codes |
| Out of scope | yes/no |

---

## C4-10 — Tests

| File | Covers |
|------|--------|
| `web/tests/continuum-assistant-v1-headless.test.ts` | A1–A9 via `processAssistantTurn` |
| `web/tests/continuum-assistant-state.test.ts` | draft persist, expiry, refresh |
| `web/tests/continuum-assistant-intents.test.ts` | intent routing priority |
| Update `web/tests/continuum-assistant-actions.test.ts` | no regression |

---

## Chunk 04 gate (G4)

| # | Check |
|---|-------|
| 1 | ZERO_UI_V1_ACTIONS.md complete |
| 2 | All v1 headless tests PASS |
| 3 | Widget leave flow works without sessionStorage |
| 4 | super_admin still blocked |
| 5 | Module disabled → chat message matches API 403 intent |

---

## Files summary

| Action | Path |
|--------|------|
| Create | `engine/process-turn.ts`, `state/conversation-store.ts`, `adapters/whatsapp.ts` |
| Create | `actions/check-balance.ts`, `list-leaves.ts`, `cancel-leave.ts`, `attendance.ts`, `payslip.ts` |
| Create | `fallback.ts`, `menus/role-menu.ts` |
| Create | `web/docs/ZERO_UI_V1_ACTIONS.md` |
| Modify | `action-types.ts`, `request-leave.ts`, `approve-leave.ts`, `orchestrator.ts` |
| Modify | `web/app/api/ai/assistant/route.ts` |
| Modify | `continuum-assistant-widget.tsx` |
| Modify | `web/prisma/schema.prisma` (conversation models) |
