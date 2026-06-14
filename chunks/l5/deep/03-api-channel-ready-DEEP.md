# L5-DEEP — Chunk 03: API Channel-Ready (Exhaustive)

> Companion to [`../03-api-channel-ready-L5.md`](../03-api-channel-ready-L5.md)  
> **Master Gate G3**

---

## DEEP-03-001 — Service layer file tree

```
web/lib/services/
├── types.ts                 # ServiceResult, ServiceErrorCode
├── leave-submit.ts
├── leave-approve.ts
├── leave-reject.ts
├── leave-cancel.ts
├── leave-balances.ts
├── leave-list.ts
├── pending-approvals.ts
├── attendance-clock.ts
├── attendance-today.ts
├── payslip-latest.ts
└── _shared/
    ├── assert-permission.ts
    ├── assert-module.ts
    └── with-idempotency.ts

web/lib/channel/
├── context-from-session.ts
├── context-from-link.ts
├── revoke-links.ts
└── types.ts
```

---

## DEEP-03-002 — submitLeaveService pseudocode (line-by-line)

1. `if (!ctx.orgId) return err FORBIDDEN`
2. `await assertCompanySetupComplete(orgId)`
3. `if (!hasPermission(ctx, 'leave.apply_own')) return err FORBIDDEN`
4. `await assertModule(ctx.orgId, 'leave')`
5. `await checkRateLimit(ctx.employeeId, 'leaves/submit')`
6. `parsed = leaveSubmitSchema.safeParse(input)` → VALIDATION_ERROR
7. `if (ctx.idempotencyKey) return withIdempotency(...)`
8. Load employee, company, leave type, balance
9. `validateLeaveDateRange`
10. `calculateLeaveDays`
11. Check overlap query — same as route
12. Constraint engine call — same breaker logic
13. `resolveLeaveApprovers`
14. `prisma.leaveRequest.create` in transaction
15. `createAuditLog LEAVE_SUBMIT` with channel in newState
16. `dispatchNotification leave_submitted`
17. Return `{ ok: true, data: { id, status, ... } }`

**No step may be skipped vs current route behavior**

---

## DEEP-03-003 — Idempotency key format

| Channel | Key source |
|---------|------------|
| WhatsApp confirm | draft.id (uuid) |
| WhatsApp button | `{draftId}:confirm` |
| HTTP API | Header `Idempotency-Key` optional |
| Web assistant | draft.id |

**Unique constraint:** `(company_id, employee_id, idempotency_key)`

**TTL default:** 24 hours

---

## DEEP-03-004 — Channel verify start (full handler)

```typescript
// POST /api/channel/verify/start
// 1. auth employee
// 2. rate limit 3/hour
// 3. normalizePhone(body.phone) → INVALID_PHONE 400
// 4. if phone owned by other employee in org → 409 PHONE_IN_USE
// 5. invalidate prior unconsumed challenges for employee
// 6. generate 6-digit code, bcrypt hash
// 7. INSERT ChannelVerificationChallenge
// 8. send email with code (Chunk 02) OR WhatsApp template (Chunk 05)
// 9. return { success: true, expiresInSeconds: 600, channel: 'whatsapp' }
```

---

## DEEP-03-005 — Channel verify confirm (full handler)

```typescript
// 1. auth employee
// 2. normalizePhone + validate externalId digits-only match
// 3. find latest challenge not consumed, not expired
// 4. if attempts >= max → CODE_LOCKED
// 5. bcrypt.compare code → on fail increment attempts, INVALID_CODE
// 6. transaction: consume challenge, upsert ChannelIdentityLink, revoke old links for same external_id
// 7. audit CHANNEL_LINK_CREATED
// 8. return { success: true, linked: true }
```

---

## DEEP-03-006 — buildContextFromLink validation chain

| Check | Error |
|-------|-------|
| link.revoked_at != null | FORBIDDEN "WhatsApp link revoked" |
| employee.status != active | FORBIDDEN |
| employee.org_id != link.company_id | INTERNAL_ERROR log + FORBIDDEN |
| company onboarding incomplete | COMPANY_SETUP_INCOMPLETE |

**Permissions:** load from employee role via getEffectiveRoles + DEFAULT_ROLE_PERMISSIONS

---

## DEEP-03-007 — HTTP route thin wrapper example

```typescript
// web/app/api/leaves/submit/route.ts
export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    const body = await request.json();
    const ctx = await buildContextFromSession(employee, {
      channel: 'web',
      idempotencyKey: request.headers.get('Idempotency-Key') ?? undefined,
    });
    const result = await submitLeaveService(ctx, body);
    return serviceResultToResponse(result, 201);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    ...
  }
}
```

---

## DEEP-03-008 — Migration SQL (reference)

```sql
CREATE TABLE "ChannelIdentityLink" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
  "employee_id" UUID NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE,
  "channel" VARCHAR(32) NOT NULL,
  "external_id" VARCHAR(32) NOT NULL,
  "phone_e164" VARCHAR(20) NOT NULL,
  "verified_at" TIMESTAMPTZ NOT NULL,
  "revoked_at" TIMESTAMPTZ,
  "revoke_reason" VARCHAR(64),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("company_id", "channel", "external_id")
);
```

Repeat for other models per L5-03-001

---

## DEEP-03-009 — audit-channel-action.ts

```typescript
export async function logChannelAction(params: {
  ctx: AssistantExecutionContext;
  kind: string;
  result: 'confirmed' | 'cancelled' | 'failed';
  entityId?: string;
  error?: string;
  payloadSummary?: Record<string, unknown>;
}) {
  await createAuditLog({
    companyId: ctx.orgId,
    actorId: ctx.employeeId,
    action: mapKindToAuditAction(params.kind),
    entityType: 'assistant_action',
    entityId: params.entityId ?? 'unknown',
    newState: {
      source: ctx.auditSource,
      channel: ctx.channel,
      external_message_id: ctx.externalMessageId ?? null,
      action_kind: params.kind,
      result: params.result,
      error: params.error ?? null,
      payload_summary: params.payloadSummary ?? {},
      idempotency_key: ctx.idempotencyKey ?? null,
    },
  });
}
```

---

## DEEP-03-010 — G3 proof artifact template

**Path:** `docs/proofs/g3-headless-leave-{ISO}.md`

```markdown
# G3 Headless Leave Proof

- Date: ...
- Command: `cd web && node scripts/run-node-tests.mjs channel-executor-headless.test.ts`
- HE-01: PASS
- HE-02: PASS
- HE-03: PASS
- HE-04: PASS
- Gate G3: PASS
```

---

## DEEP-03-011 — Tests HE-11 – HE-25

| ID | Description |
|----|-------------|
| HE-11 | rejectLeaveService manager ok |
| HE-12 | cancelLeaveService own pending |
| HE-13 | listOwnLeaves pagination |
| HE-14 | getTodayAttendance no record |
| HE-15 | payslip latest none NOT_FOUND |
| HE-16 | verify start rate limit |
| HE-17 | verify confirm expired |
| HE-18 | idempotency expired key re-runs |
| HE-19 | service never imports next/headers |
| HE-20 | audit channel web on session ctx |
| HE-21 | audit channel whatsapp on link ctx |
| HE-22 | concurrent submit same key one row |
| HE-23 | approve wrong status NOT_FOUND |
| HE-24 | clock wfh when allowed |
| HE-25 | buildContextFromSession portalSlug correct |
