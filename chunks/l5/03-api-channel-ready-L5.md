# L5 — Chunk 03: API Channel-Ready Internals

> Parent: `../03-api-channel-ready.md`  
> **Master Gate G3** defined here

---

## L5-03-001 — Prisma migrations (complete DDL intent)

**Migration name:** `20260613_zero_ui_channel_identity`

### ChannelIdentityLink

| Column | PG type | Nullable | Index |
|--------|---------|----------|-------|
| id | UUID PK | no | PK |
| company_id | UUID FK Company | no | idx company_id+phone |
| employee_id | UUID FK Employee | no | idx employee_id+channel |
| channel | VARCHAR(32) | no | unique composite |
| external_id | VARCHAR(32) | no | unique (company_id, channel, external_id) |
| phone_e164 | VARCHAR(20) | no | |
| verified_at | TIMESTAMPTZ | no | |
| revoked_at | TIMESTAMPTZ | yes | |
| revoke_reason | VARCHAR(64) | yes | |
| created_at | TIMESTAMPTZ | no | |
| updated_at | TIMESTAMPTZ | no | |

### ChannelVerificationChallenge

| Column | Type | Notes |
|--------|------|-------|
| code_hash | TEXT | bcrypt cost 10 |
| attempts | INT default 0 | increment on wrong code |
| max_attempts | INT default 3 | |
| expires_at | TIMESTAMPTZ | now + 10 minutes |
| consumed_at | TIMESTAMPTZ | set on success |

### WhatsAppTenantConfig

| Column | Type | Notes |
|--------|------|-------|
| access_token_enc | TEXT | AES-256-GCM: base64(iv+ciphertext+tag) |
| phone_number_id | VARCHAR(32) UNIQUE | Meta phone number id |
| messaging_enabled | BOOLEAN default true | kill switch |

### IdempotencyRecord

| Column | Type | Notes |
|--------|------|-------|
| idempotency_key | VARCHAR(128) | |
| response_json | JSONB | cached ServiceResult |
| http_status | INT | |
| expires_at | TIMESTAMPTZ | now + 24h default |

---

## L5-03-002 — AES-256-GCM token crypto

**File:** `web/lib/whatsapp/crypto.ts`

```typescript
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // bytes
const TAG_LENGTH = 16;

export function encryptToken(plaintext: string, keyBase64: string): string {
  // key = Buffer.from(keyBase64, 'base64') — must be 32 bytes
  // iv = randomBytes(12)
  // cipher.update + final → tag
  // return base64(iv || ciphertext || tag)
}

export function decryptToken(ciphertextBase64: string, keyBase64: string): string;
```

**Env:** `WHATSAPP_TOKEN_ENCRYPTION_KEY` — 32 random bytes base64-encoded

**Rotation procedure:** dual-key decrypt with old, re-encrypt with new, document in runbook

---

## L5-03-003 — AssistantExecutionContext builder

**File:** `web/lib/channel/context-from-session.ts`

```typescript
export async function buildContextFromSession(
  employee: AuthEmployeeWithCompany,
  opts?: { channel?: ChannelType; externalMessageId?: string; idempotencyKey?: string }
): Promise<AssistantExecutionContext>;
```

**Maps:**

| AuthEmployee field | Context field |
|--------------------|---------------|
| id | employeeId |
| org_id | orgId |
| email | email |
| first_name | firstName |
| last_name | lastName |
| primary_role | primaryRole |
| permissions | permissions |
| resolvePortalSlugFromRole(role) | portalSlug |

**File:** `web/lib/channel/context-from-link.ts`

```typescript
export async function buildContextFromLink(
  link: ChannelIdentityLink,
  opts?: { externalMessageId?: string; idempotencyKey?: string }
): Promise<AssistantExecutionContext>;
```

**Validates:** link.revoked_at === null, employee.status === 'active', employee.org_id === link.company_id

---

## L5-03-004 — submitLeaveService signature

**File:** `web/lib/services/leave-submit.ts`

```typescript
export interface LeaveSubmitInput {
  leave_type: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;
  reason: string;
  is_half_day?: boolean;
  attachment_url?: string;
}

export interface LeaveSubmitOutput {
  id: string;
  status: string;
  total_days: number;
  leave_type: string;
  start_date: string;
  end_date: string;
}

export async function submitLeaveService(
  ctx: AssistantExecutionContext,
  input: LeaveSubmitInput
): Promise<ServiceResult<LeaveSubmitOutput>>;
```

**Internal steps (must mirror route exactly):**

1. assertCompanySetupComplete for ctx.orgId
2. assertPermission(ctx.permissions, 'leave.apply_own')
3. requireModuleForOrg(ctx.orgId, 'leave') — throw ServiceResult not ok
4. checkRateLimit for ctx.employeeId bucket leaves/submit
5. withIdempotency if ctx.idempotencyKey set
6. execute prisma + constraint + audit with actorId = ctx.employeeId
7. dispatchNotification leave_submitted
8. return ServiceResult

**Error codes:**

| code | status | message example |
|------|--------|-----------------|
| VALIDATION_ERROR | 400 | Validation failed |
| CONSTRAINT_VIOLATION | 400 | user-safe constraint text |
| INSUFFICIENT_BALANCE | 400 | Not enough balance |
| MODULE_DISABLED | 403 | module message |
| FORBIDDEN | 403 | Permission denied |
| RATE_LIMIT | 429 | Rate limit exceeded |
| NOTICE_PERIOD | 403 | Notice period restriction |

---

## L5-03-005 — approveLeaveService signature

```typescript
export interface LeaveApproveInput {
  requestId: string;
  action: 'approve' | 'reject';
  reason?: string;
}

export async function approveLeaveService(
  ctx: AssistantExecutionContext,
  input: LeaveApproveInput
): Promise<ServiceResult<{ requestId: string; status: string }>>;
```

**Permission:** approve → need approve_team (and canActOnLeaveRequest) OR approve_any

---

## L5-03-006 — Phone verify APIs (byte-level)

### POST /api/channel/verify/start

**Headers:** Cookie continuum-access OR Bearer

**Request:**

```json
{ "phone": "+919876543210", "channel": "whatsapp" }
```

**OTP generation:**

```typescript
const code = String(crypto.randomInt(100000, 999999)); // 6 digits
const code_hash = await bcrypt.hash(code, 10);
```

**Delivery channels (Chunk 02 stub):** email to employee.email with subject "Your Continuum verification code"

**Response 200:**

```json
{ "success": true, "expiresInSeconds": 600, "channel": "whatsapp" }
```

### POST /api/channel/verify/confirm

**Request:**

```json
{
  "phone": "+919876543210",
  "code": "123456",
  "channel": "whatsapp",
  "externalId": "919876543210"
}
```

**externalId rule:** digits only, no + prefix, matches Meta `messages[].from`

**On success INSERT ChannelIdentityLink:**

| Field | Value |
|-------|-------|
| verified_at | new Date() |
| phone_e164 | normalized |
| external_id | externalId |

---

## L5-03-007 — withIdempotency algorithm

```typescript
async function withIdempotency<T>(ctx, action, key, ttlHours, fn) {
  const existing = await prisma.idempotencyRecord.findUnique({
    where: { company_id_employee_id_idempotency_key: { company_id: ctx.orgId, employee_id: ctx.employeeId, idempotency_key: key } }
  });
  if (existing && existing.expires_at > new Date()) {
    return JSON.parse(existing.response_json) as ServiceResult<T>;
  }
  const result = await fn();
  await prisma.idempotencyRecord.upsert({ ... store result, http_status, expires_at });
  return result;
}
```

---

## L5-03-008 — G3 headless test (exact)

**File:** `web/tests/channel-executor-headless.test.ts`

**Setup fixtures:**

- companyId, employeeId (role employee), managerId (role manager)
- LeaveType CL enabled with balance 10
- No cookies, no NextRequest

**HE-01:**

```typescript
const ctx = await buildContextForEmployee(employeeId, { channel: 'whatsapp' });
const r = await submitLeaveService(ctx, { leave_type: 'CL', start_date: '2026-07-01', end_date: '2026-07-01', reason: 'Headless test' });
assert.equal(r.ok, true);
```

**HE-02:** manager ctx approve same request id → ok true

**HE-03:** employee ctx approve → ok false, status 403

**HE-04:** same idempotencyKey twice → same request id returned, single DB row

---

## L5-03-009 — Deprecate http-execute

**File:** `web/lib/continuum-assistant/actions/http-execute.ts`

**CI rule:** grep must return 0 matches in:

- request-leave.ts
- approve-leave.ts

for `forwardAuthenticatedApi`

**Keep:** `logAssistantAction` — move to audit-channel-action.ts or keep exported

---

## L5-03-010 — Service file manifest

| File | Exported functions |
|------|-------------------|
| leave-submit.ts | submitLeaveService |
| leave-approve.ts | approveLeaveService |
| leave-reject.ts | rejectLeaveService |
| leave-cancel.ts | cancelLeaveService |
| leave-balances.ts | getLeaveBalancesService |
| leave-list.ts | listOwnLeavesService |
| pending-approvals.ts | listPendingApprovalsService |
| attendance-clock.ts | clockAttendanceService |
| attendance-today.ts | getTodayAttendanceService |
| payslip-latest.ts | getLatestPayslipService |

Each returns `ServiceResult<T>` never throws except programmer error

---

## L5-03-PART-B — ServiceResult type

**File:** `web/lib/services/types.ts`

```typescript
export type ServiceErrorCode =
  | 'VALIDATION_ERROR' | 'INSUFFICIENT_BALANCE' | 'MODULE_DISABLED'
  | 'COMPANY_SETUP_INCOMPLETE' | 'FORBIDDEN' | 'NOT_FOUND' | 'RATE_LIMIT'
  | 'ALREADY_CLOCKED_IN' | 'WFH_DISABLED' | 'INTERNAL_ERROR';

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ServiceErrorCode; message: string; httpStatus: number } };
```

---

## L5-03-PART-C — Route → service refactor map

| Route | Service |
|-------|---------|
| POST leaves/submit | submitLeaveService |
| POST leaves/approve/[id] | approveLeaveService |
| POST attendance | clockAttendanceService |
| GET attendance?today=1 | getTodayAttendanceService |
| GET payroll/slips/latest | getLatestPayslipService |

---

## L5-03-PART-D — Tenant isolation + G3 tests HE-01–HE-10

| ID | Assert |
|----|--------|
| HE-01 | employee submit ok |
| HE-02 | manager approve ok |
| HE-03 | employee approve 403 |
| HE-04 | idempotency replay |
| HE-05 | cross-tenant 403 |
| HE-06 | module disabled |
| HE-07 | setup incomplete |
| HE-08 | double clock in |
| HE-09 | balances list |
| HE-10 | pending scope manager |

**Fixture:** `web/tests/fixtures/channel-headless-seed.ts`
