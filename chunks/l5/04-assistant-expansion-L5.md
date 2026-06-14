# L5 — Chunk 04: Assistant Expansion Internals

> Parent: `../04-ai-assistant-expansion.md`

---

## L5-04-001 — Widget constants (from source)

**File:** `web/components/assistant/continuum-assistant-widget.tsx`

| Constant | Value | Purpose |
|----------|-------|---------|
| POS_STORAGE_KEY | continuum-assistant-position | FAB x,y localStorage — KEEP |
| DRAFT_STORAGE_KEY | continuum-assistant-action-draft | **REMOVE** — server state |
| FAB_SIZE | 56 | px diameter |
| DESKTOP_PANEL_WIDTH | 380 | px |

**AssistantActionDraft type (lines 29-36):**

```typescript
{
  id: string; // uuid
  kind: 'request_leave' | 'approve_leave' | 'reject_leave'; // EXTEND in Chunk 04
  status: 'collecting' | 'awaiting_confirmation';
  payload: Record<string, unknown>;
  createdAt: string; // ISO
  expiresAt: string; // ISO now+15min
}
```

**API call (lines 225-235):**

```typescript
fetch('/api/ai/assistant', {
  method: 'POST',
  credentials: 'include',
  body: JSON.stringify({ message, history, actionDraft, actionCommand }),
  headers: { 'Content-Type': 'application/json' },
})
```

---

## L5-04-002 — POST /api/ai/assistant (complete)

**File:** `web/app/api/ai/assistant/route.ts`

**Blocked role:** super_admin → 403 `{ error: { code: 'FORBIDDEN', message: 'Assistant is not available for super admin accounts.' } }`

**bodySchema:**

| Field | Zod |
|-------|-----|
| message | string min 1 max 2000 |
| actionCommand | enum confirm \| cancel optional |
| actionDraft | object nullable optional (see actionDraftSchema) |
| history | array max 12 of { role: user\|assistant, content max 4000 } |

**Rate limit:** checkApiRateLimit(employee.id, 'general') → 429 `{ error: { code: 'RATE_LIMIT', message: 'Too many requests. Please wait a moment.' } }`

**Response shape AssistantReply:**

```typescript
{
  reply: string;
  links: { label: string; href: string }[];
  suggestions: string[];
  source: 'rules' | 'llm' | 'hybrid';
  actionDraft?: AssistantActionDraft | null;
  pendingAction?: { kind, summaryText, expiresAt } | null;
  actionResult?: { executed, success, message, entityId? };
}
```

---

## L5-04-003 — processAssistantTurn priority (exact order)

**File:** `web/lib/continuum-assistant/engine/process-turn.ts`

| Step | Condition | Handler |
|------|-----------|---------|
| 1 | draft expired | clearDraft, prepend expiry message |
| 2 | actionCommand cancel OR cancel regex | clearDraft, cancelReply |
| 3 | actionCommand confirm OR confirm regex + draft awaiting | execute service by draft.kind |
| 4 | draft collecting + message | merge draft, return next prompt |
| 5 | draft awaiting + not confirm | append "Reply CONFIRM or CANCEL" |
| 6 | insight intent match | insights/handlers.ts (read-only) |
| 7 | action intent match | action handlers A1-A9 |
| 8 | help intent | role-menu.ts |
| 9 | LLM + nav hints | respond.ts |
| 10 | fallback | fallback.ts out-of-scope |

**Confirm regex:** `/^(confirm|yes|y|ok|okay|✅|proceed|submit)$/i`  
**Cancel regex:** `/^(cancel|no|n|stop|abort|❌|discard)$/i`

---

## L5-04-004 — Conversation Prisma operations

**getOrCreateConversation:**

```sql
INSERT ... ON CONFLICT (company_id, employee_id, channel) DO UPDATE SET updated_at = now()
```

**appendMessages:** INSERT 2 rows, DELETE WHERE id NOT IN (SELECT id ... ORDER BY created_at DESC LIMIT 40)

**loadDraft:** if expires_at < now() → DELETE draft RETURN null

---

## L5-04-005 — Action A1 request_leave L5

**Intent patterns (minimum):**

```typescript
const REQUEST_LEAVE = [
  /request\s+(annual|sick|casual|earned)?\s*leave/i,
  /apply\s+for\s+leave/i,
  /book\s+leave/i,
  /(\bCL\b|\bSL\b|\bPL\b)\s+leave/i,
];
```

**Draft payload RequestLeavePayload:**

| Key | Type | Required before confirm |
|-----|------|-------------------------|
| leave_type | string | yes |
| start_date | YYYY-MM-DD | yes |
| end_date | YYYY-MM-DD | yes |
| reason | string min 3 | yes |
| is_half_day | boolean | default false |

**Collecting prompts (exact copy):**

| Missing | Bot reply |
|---------|-----------|
| leave_type | "Which leave type would you like to use? (e.g. CL, SL, PL)" |
| start_date | "What is the start date? (YYYY-MM-DD or say 'tomorrow')" |
| end_date | "What is the end date?" |
| reason | "Please share a brief reason for this leave." |

**Confirm summary (WhatsApp):**

```text
Leave request summary:
Type: {leave_type}
Dates: {start_date} – {end_date} ({days} day(s))
Reason: {reason}

Reply CONFIRM to submit or CANCEL to discard.
This draft expires in 15 minutes.
```

**Execute:** submitLeaveService(ctx, payload) with idempotencyKey = draft.id

---

## L5-04-006 — Actions A2-A9 intent + service map

| ID | Intent regex (sample) | Service | Confirm? |
|----|----------------------|---------|----------|
| A2 | /(leave\s+)?balance/i | getLeaveBalancesService | no |
| A3 | /my\s+leaves/i | listOwnLeavesService | no |
| A4 | /cancel\s+(my\s+)?leave/i | cancelLeaveService draft | yes |
| A5 | /pending\s+approval/i | listPendingApprovalsService | no |
| A6 | /approve\s+leave/i | approveLeaveService draft | yes |
| A6b | /reject\s+leave/i | rejectLeaveService draft | yes |
| A7 | /clock\s*in/i | clockAttendanceService check_in | yes if ambiguous |
| A7b | /clock\s*out/i | clockAttendanceService check_out | yes |
| A8 | /(checked\s+in|attendance\s+today)/i | getTodayAttendanceService | no |
| A9 | /pay\s*slip/i | getLatestPayslipService | no |

---

## L5-04-007 — WhatsApp adapter

**File:** `web/lib/continuum-assistant/adapters/whatsapp.ts`

```typescript
export function assistantReplyToWhatsAppMessages(reply: AssistantReply): WhatsAppOutbound[] {
  const messages: WhatsAppOutbound[] = [];
  let text = reply.reply;
  // Convert **bold** to *bold*
  text = text.replace(/\*\*(.+?)\*\*/g, '*$1*');
  // Split >4096 at paragraph boundaries
  for (const chunk of splitText(text, 4096)) {
    messages.push({ type: 'text', text: chunk });
  }
  if (reply.pendingAction) {
    messages.push({
      type: 'interactive_buttons',
      text: reply.pendingAction.summaryText,
      buttons: [
        { id: 'confirm', title: 'Confirm' },
        { id: 'cancel', title: 'Cancel' },
      ],
    });
  }
  return messages;
}
```

---

## L5-04-008 — Fallback messages (exact)

**File:** `web/lib/continuum-assistant/fallback.ts`

| Trigger | Reply template |
|---------|----------------|
| payroll run | "I can't run payroll in chat. Open Continuum: {base}/{portalSlug}/payroll" |
| invite user | "I can't invite users in chat. Open: {base}/admin/people/invite" |
| settings | "Policy changes must be done in the admin portal: {base}/admin/company-settings" |
| module disabled | "The {moduleName} module isn't enabled for your company. Contact your admin." |
| generic | "I can't do that in chat yet. Reply HELP for available actions or open: {base}/{portalSlug}/dashboard" |

---

## L5-04-009 — ZERO_UI_V1_ACTIONS.md outline

Each action section must contain:

1. Action ID (A1..A10)
2. Example phrases (min 10)
3. permission codes
4. module slug
5. Multi-turn script (user/bot alternating)
6. Confirm/Cancel copy
7. Success messages
8. Error code → user message table
9. Deep link fallback URL pattern

---

## L5-04-010 — Test catalog

| ID | Test |
|----|------|
| C04-T01 | processAssistantTurn request leave end-to-end confirm |
| C04-T02 | draft persists after simulated "refresh" (reload from DB) |
| C04-T03 | expired draft cleared |
| C04-T04 | employee cannot trigger approve intent success |
| C04-T05 | module leave disabled → friendly message |
| C04-T06 | out-of-scope payroll → fallback link |
| C04-T07 | whatsapp adapter splits 5000 char reply into 2 messages |
| C04-T08 | widget works without sessionStorage draft |

---

## L5-04-PART-B — Action A1 full multi-turn script (10 examples)

| # | User message | Bot state after |
|---|--------------|-----------------|
| 1 | "I need CL tomorrow" | collecting end_date, reason |
| 2 | "Apply for sick leave Mon–Wed" | collecting reason |
| 3 | "Book PL from 2026-07-01 to 2026-07-05 for vacation" | awaiting_confirmation |
| 4 | "half day CL today" | is_half_day true, awaiting_confirmation |
| 5 | "request annual leave next Friday" | parse date → start_date |
| 6 | CONFIRM after draft | execute submitLeaveService |
| 7 | CANCEL after draft | clear draft |
| 8 | "yes" after summary | confirm regex match |
| 9 | expired draft + "confirm" | expiry message, no submit |
| 10 | "leave" ambiguous | prompt leave_type |

---

## L5-04-PART-C — Action A10 insights (read-only)

| Intent | Handler file | Data source |
|--------|--------------|-------------|
| team on leave today | insights/team-leave-today.ts | LeaveRequest approved overlapping today |
| my pending count | insights/pending-count.ts | own pending leaves |
| team attendance summary | insights/team-attendance.ts | Attendance today |

**No confirm step** — reply only, no draft

---

## L5-04-PART-D — Conversation store operations (SQL-level)

**getOrCreateConversation(companyId, employeeId, channel):**

1. SELECT id FROM AssistantConversation WHERE unique triple
2. INSERT if missing
3. RETURN id

**saveDraft(conversationId, draft, expiresAt):**

UPDATE AssistantConversation SET draft_json = $draft, draft_expires_at = $expires

**clearDraft(conversationId):**

UPDATE SET draft_json = NULL, draft_expires_at = NULL

**appendMessages:** INSERT user + assistant rows; prune to 40 messages

---

## L5-04-PART-E — Widget migration checklist

| Task | File | Done when |
|------|------|-----------|
| Remove DRAFT_STORAGE_KEY reads | continuum-assistant-widget.tsx | zero sessionStorage draft |
| Pass actionCommand from button clicks | widget | confirm/cancel buttons work |
| Show pendingAction banner | widget | summary visible |
| Handle actionResult toast | widget | success/error message |
| Preserve POS_STORAGE_KEY | widget | FAB position unchanged |

---

## L5-04-PART-F — LLM boundary rules

**LLM may:** answer HR FAQ, suggest navigation links, clarify ambiguous dates  
**LLM may NOT:** invent leave balances, approve leaves, bypass confirm step, expose other employee PII  
**System prompt must include:** enabled modules list, role, permission denied fallback  
**Max tokens out:** 500 for WhatsApp compatibility

---

## L5-04-PART-G — ZERO_UI_V1_ACTIONS.md — A1 section template (complete)

```markdown
## A1 — Request leave

### Permissions
- leave.apply_own
- Module: leave

### Example phrases
1. request leave
2. apply for CL
3. book sick leave tomorrow
4. I need PL next week
5. half day today
6. casual leave Monday
7. apply SL for 2 days
8. take leave from July 1 to 3
9. need a day off Friday
10. request earned leave

### Multi-turn script
User: I need leave tomorrow
Bot: Which leave type? (CL, SL, PL)
User: CL
Bot: End date? (same day if half day)
...

### Errors
| code | User message |
| INSUFFICIENT_BALANCE | You don't have enough {type} balance. |
| MODULE_DISABLED | Leave isn't enabled for your company. |

### Deep link
{base}/{portalSlug}/request-leave
```

Repeat structure for A2–A10 in doc file.

---

## L5-04-PART-H — Extended tests C04-T09 – C04-T20

| ID | Test |
|----|------|
| C04-T09 | A2 balance no draft |
| C04-T10 | A5 pending manager only |
| C04-T11 | A6 approve wrong role 403 |
| C04-T12 | A7 clock in confirm |
| C04-T13 | A9 payslip link not PDF in chat |
| C04-T14 | insight team leave read-only |
| C04-T15 | history max 12 turns |
| C04-T16 | rate limit 429 assistant |
| C04-T17 | super_admin 403 |
| C04-T18 | merge collecting leave_type |
| C04-T19 | date parse "tomorrow" IST |
| C04-T20 | audit source continuum_assistant |
