# Chunk 03 — API Layer: Channel-Ready (Full Specification)

> **Status:** `not_started` | **Gate:** `pending` | **Depends on:** Chunks 01, 02 | **Est.:** 8–10 dev-days  
> **Master Gate:** **G3** — headless leave submit + approve  
> **L5 (implement from):** [`l5/03-api-channel-ready-L5.md`](./l5/03-api-channel-ready-L5.md)

---

## L1 — Room purpose

**Room name:** Identity & Plumbing Layer  
**Business outcome:** WhatsApp (and web assistant) invoke HR actions using **verified employee identity**, not browser cookies. Without this room, Zero UI is a security incident waiting to happen.  
**Revenue link:** Enterprise buyers ask "how do you authenticate WhatsApp users?" — this chunk is the answer.

---

## L2 — Problem statement (current code)

**File:** `web/lib/continuum-assistant/actions/http-execute.ts`

The assistant POSTs to internal APIs forwarding `request.headers.get('cookie')`. WhatsApp webhooks have **no JWT cookie**. Must replace with direct service calls.

---

## L3 — New Prisma models (Level 5 — exact fields)

Add to `web/prisma/schema.prisma`:

### ChannelIdentityLink

```prisma
model ChannelIdentityLink {
  id            String    @id @default(uuid())
  company_id    String
  employee_id   String
  channel       String    // 'whatsapp' | 'web_linked'
  external_id   String    // Meta wa_id without + prefix, e.g. "919876543210"
  phone_e164    String    // "+919876543210"
  verified_at   DateTime
  revoked_at    DateTime?
  revoke_reason String?
  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt

  Company       Company   @relation(fields: [company_id], references: [id], onDelete: Cascade)
  Employee      Employee  @relation(fields: [employee_id], references: [id], onDelete: Cascade)

  @@unique([company_id, channel, external_id])
  @@index([company_id, phone_e164])
  @@index([employee_id, channel])
}
```

### ChannelVerificationChallenge

```prisma
model ChannelVerificationChallenge {
  id           String   @id @default(uuid())
  company_id   String
  employee_id  String?  // null until matched
  phone_e164   String
  channel      String   // 'whatsapp'
  code_hash    String   // bcrypt hash of 6-digit OTP
  attempts     Int      @default(0)
  max_attempts Int      @default(3)
  expires_at   DateTime
  consumed_at  DateTime?
  created_at   DateTime @default(now())

  @@index([company_id, phone_e164, channel])
}
```

### WhatsAppTenantConfig

```prisma
model WhatsAppTenantConfig {
  id                 String    @id @default(uuid())
  company_id         String    @unique
  waba_id            String?
  phone_number_id    String    @unique
  display_phone_e164 String?
  access_token_enc   String    // AES-256-GCM ciphertext
  token_expires_at   DateTime?
  status             String    @default("disconnected") // connected|disconnected|error
  messaging_enabled  Boolean   @default(true)
  connected_at       DateTime?
  disconnected_at    DateTime?
  last_error_code    String?
  created_at         DateTime  @default(now())
  updated_at         DateTime  @updatedAt

  Company            Company   @relation(fields: [company_id], references: [id], onDelete: Cascade)
}
```

### IdempotencyRecord

```prisma
model IdempotencyRecord {
  id            String   @id @default(uuid())
  company_id    String
  employee_id   String
  idempotency_key String
  action        String   // 'leave_submit' | 'attendance_clock_in' | ...
  response_json Json
  http_status   Int
  created_at    DateTime @default(now())
  expires_at    DateTime

  @@unique([company_id, employee_id, idempotency_key])
  @@index([expires_at])
}
```

**Migration name:** `20260613_zero_ui_channel_identity`

---

## C3-01 — AssistantExecutionContext

**Create:** `web/lib/channel/execution-context.ts`

```typescript
export type ChannelType = 'web' | 'whatsapp';

export interface AssistantExecutionContext {
  channel: ChannelType;
  employeeId: string;
  orgId: string;
  email: string;
  firstName: string;
  lastName: string;
  primaryRole: UserRole; // from web/lib/rbac.ts
  permissions: PermissionCode[];
  portalSlug: string;   // from resolvePortalSlugFromRole
  externalMessageId?: string;
  idempotencyKey?: string;
}
```

**Build from session — Create:** `web/lib/channel/context-from-session.ts`

| Input | Source |
|-------|--------|
| employee | `getAuthEmployee(request)` from `web/lib/auth-guard.ts` |
| permissions | `employee.permissions` already loaded |
| portalSlug | `resolvePortalSlugFromRole(employee.primary_role)` from assistant knowledge |

**Build from channel link — Create:** `web/lib/channel/context-from-link.ts`

| Input | Lookup |
|-------|--------|
| link | `ChannelIdentityLink` where not revoked |
| employee | join Employee + verify status = active |

**Hard fail if:** employee.status not active → throw `AuthError('Account is not active.', 403)`

---

## C3-02 — Service layer (extract from routes)

### Pattern

Each service file:

```typescript
export async function submitLeaveService(
  ctx: AssistantExecutionContext,
  input: LeaveSubmitInput
): Promise<ServiceResult<LeaveSubmitOutput>>
```

**ServiceResult type — Create:** `web/lib/services/types.ts`

```typescript
export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; status: number; details?: unknown };
```

### submitLeaveService

**Create:** `web/lib/services/leave-submit.ts`  
**Extract logic from:** `web/app/api/leaves/submit/route.ts` (lines 44–572)  
**Must preserve:** rate limit, permission check, module guard, notice period, constraint engine, balance upsert, audit, email, notifications

**Route after refactor:**

```typescript
export async function POST(request: NextRequest) {
  const employee = await getAuthEmployee(request);
  const ctx = await contextFromSession(employee);
  const body = leaveSubmitSchema.parse(await request.json());
  const result = await submitLeaveService(ctx, body);
  if (!result.ok) return NextResponse.json({ error: { code: result.code, message: result.message } }, { status: result.status });
  return NextResponse.json(result.data, { status: 201 });
}
```

### Other services (same pattern)

| Service file | Source route |
|--------------|--------------|
| `web/lib/services/leave-approve.ts` | `web/app/api/leaves/approve/[requestId]/route.ts` |
| `web/lib/services/leave-reject.ts` | `web/app/api/leaves/reject/[requestId]/route.ts` |
| `web/lib/services/leave-cancel.ts` | `web/app/api/leaves/cancel/[requestId]/route.ts` |
| `web/lib/services/leave-balances.ts` | `web/app/api/leaves/balances/route.ts` |
| `web/lib/services/leave-list.ts` | `web/app/api/leaves/list/route.ts` |
| `web/lib/services/pending-approvals.ts` | `web/app/api/manager/pending-approvals/route.ts` |
| `web/lib/services/attendance-clock.ts` | `web/app/api/attendance/route.ts` POST |
| `web/lib/services/attendance-today.ts` | `web/app/api/attendance/route.ts` GET |
| `web/lib/services/payslip-latest.ts` | `web/app/api/payroll/slips/route.ts` |

---

## C3-03 — Phone verification APIs

### POST /api/channel/verify/start

**Create:** `web/app/api/channel/verify/start/route.ts`  
**Auth:** web session required (`getAuthEmployee`)  
**Body:**

```json
{ "phone": "+919876543210", "channel": "whatsapp" }
```

**Validation:**

| Rule | Error code | Message |
|------|------------|---------|
| phone invalid E.164 | `INVALID_PHONE` | "Enter a valid mobile number with country code." |
| rate > 5/hour/phone | `RATE_LIMIT` | "Too many verification attempts. Try again in an hour." HTTP 429 |

**Behavior:**

1. Normalize phone → `phone_e164`
2. Update `Employee.phone` if empty or matches
3. Create `ChannelVerificationChallenge` with 6-digit OTP, bcrypt hash, `expires_at = now + 10 min`
4. Return `{ success: true, expiresInSeconds: 600 }` — **never return OTP in response**
5. Send OTP via email/SMS stub (WhatsApp template in Chunk 05)

### POST /api/channel/verify/confirm

**Create:** `web/app/api/channel/verify/confirm/route.ts`  
**Body:**

```json
{ "phone": "+919876543210", "code": "123456", "channel": "whatsapp", "externalId": "919876543210" }
```

**Validation:**

| Rule | Error | HTTP |
|------|-------|------|
| challenge expired | `CODE_EXPIRED` "Verification code expired. Request a new one." | 400 |
| attempts >= 3 | `CODE_LOCKED` "Too many wrong attempts. Request a new code." | 400 |
| wrong code | increment attempts, `CODE_INVALID` "Incorrect code." | 400 |
| success | create `ChannelIdentityLink`, set `consumed_at` | 200 |

**Response:**

```json
{
  "success": true,
  "linkId": "uuid",
  "verifiedAt": "ISO8601"
}
```

### Revocation

**Create:** `web/lib/channel/revoke-hooks.ts`

```typescript
export async function revokeChannelLinksForEmployee(
  employeeId: string,
  reason: 'phone_changed' | 'terminated' | 'opt_out' | 'admin_revoke'
): Promise<void>
```

**Call from:**

- `web/app/api/profile/route.ts` on phone change
- HR employee status → terminated
- WhatsApp STOP handler (Chunk 05)

---

## C3-04 — Idempotency

**Create:** `web/lib/idempotency/store.ts`

```typescript
export async function withIdempotency<T>(
  ctx: AssistantExecutionContext,
  action: string,
  key: string,
  ttlHours: number,
  fn: () => Promise<ServiceResult<T>>
): Promise<ServiceResult<T>>
```

**Key sources:**

| Action | Key format |
|--------|------------|
| WhatsApp leave submit | `wa_msg:{metaMessageId}` |
| Web assistant | client UUID in `actionDraft.id` optional |
| Clock in | `{employeeId}:{dateKey}:check_in` |

**Duplicate behavior:** return cached `response_json` + original `http_status`, do not re-execute fn

---

## C3-05 — Rate limiting (channel)

**Extend:** `web/lib/api-rate-limit.ts`

| Bucket key | Limit | Window |
|------------|-------|--------|
| `channel:whatsapp:emp:{employeeId}` | 30 | 60s |
| `channel:whatsapp:co:{orgId}` | 500 | 60s |
| `channel:verify:phone:{phone_e164}` | 5 | 3600s |

**429 response for chat:**

```json
{ "error": { "code": "RATE_LIMIT", "message": "Too many messages. Please wait a moment and try again." } }
```

---

## C3-06 — Tenant resolver (stub)

**Create:** `web/lib/channel/tenant-resolver.ts`

```typescript
export async function resolveTenantByPhoneNumberId(
  phoneNumberId: string
): Promise<{
  companyId: string;
  phoneNumberId: string;
  accessToken: string; // decrypted
  messagingEnabled: boolean;
} | null>
```

**Decrypt via:** `web/lib/whatsapp/crypto.ts` (Chunk 05 implements crypto; stub pass-through in Chunk 03 tests with plaintext test fixture)

**Unknown tenant:** return null — webhook logs alert, returns 200 to Meta (Chunk 05)

---

## C3-07 — Multi-tenant isolation tests

**Create:** `web/tests/tenant-isolation.test.ts`

| Test ID | Scenario | Expected |
|---------|----------|----------|
| TI-01 | ctx company A, leave type id company B | `ok: false`, status 403 |
| TI-02 | ctx employee A, approve request id company B | 403 |
| TI-03 | ChannelLink company A, message on company B number | no processing |
| TI-04 | Revoked link | ctx build fails 403 |

**Create:** `web/scripts/audit-tenant-scope.ts` — static scan for prisma queries missing company_id filter in `web/lib/services/**`

---

## C3-08 — Headless gate test G3

**Create:** `web/tests/channel-executor-headless.test.ts`

```typescript
// 1. Seed employee with leave.apply_own in test DB
// 2. const ctx = buildContextForEmployee(employeeId, { channel: 'whatsapp' })
// 3. const submit = await submitLeaveService(ctx, { leave_type: 'CL', start_date, end_date, reason: 'test' })
// 4. assert submit.ok === true
// 5. const mgrCtx = buildContextForEmployee(managerId, ...)
// 6. const approve = await approveLeaveService(mgrCtx, { requestId: submit.data.id })
// 7. assert approve.ok === true
// NO fetch(), NO cookies
```

---

## Standard error envelope (all services)

```json
{
  "error": {
    "code": "CONSTRAINT_VIOLATION",
    "message": "You cannot take leave on 2026-01-26 — company holiday.",
    "details": { "rule_id": "RULE004" }
  }
}
```

**Chat rule:** surface only `message` to user; log `code` + `details` to Sentry

---

## Chunk 03 gate

| # | Requirement |
|---|-------------|
| 1 | Migration applied for 4 new models |
| 2 | `channel-executor-headless.test.ts` PASS (G3) |
| 3 | `tenant-isolation.test.ts` PASS |
| 4 | `channel-verify.test.ts` PASS |
| 5 | `forwardAuthenticatedApi` not called from `request-leave.ts` / `approve-leave.ts` |
| 6 | `web/docs/api/v1-zero-ui-catalog.md` lists all service functions |

---

## Files summary

| Action | Path |
|--------|------|
| Create | `web/lib/channel/*` (6 files) |
| Create | `web/lib/services/*` (9 files) |
| Create | `web/lib/idempotency/store.ts` |
| Create | `web/lib/phone/normalize.ts` |
| Create | `web/app/api/channel/verify/start/route.ts` |
| Create | `web/app/api/channel/verify/confirm/route.ts` |
| Modify | `web/prisma/schema.prisma` |
| Modify | `web/lib/continuum-assistant/actions/request-leave.ts` |
| Modify | `web/lib/continuum-assistant/actions/approve-leave.ts` |
| Deprecate | `web/lib/continuum-assistant/actions/http-execute.ts` |
