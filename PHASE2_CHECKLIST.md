# Continuum - Phase 2 Implementation Checklist

> Remaining enterprise features from the original audit.
> Each item is verifiable. Check off during implementation.

---

## LAYER 6: Join Code & Collision Handling ⬜

### 6.1 Join Code Collision Retry
- [ ] `createCompanyAndEmployee` has collision detection with 5 retries
- [ ] `/api/auth/register` has proper collision retry (not silent fallthrough)
- [ ] Clear error returned if all 5 retries fail
- [ ] Uses `crypto.randomBytes()` for entropy (already done)
- [ ] Build passes

---

## LAYER 7: Auth Event Audit Logging ⬜

### 7.1 Sign-In Audit Logging
- [ ] Sign-in success logged to AuditLog with hash chain
- [ ] Sign-in failure logged with IP address
- [ ] Audit action `USER_SIGN_IN` created
- [ ] Audit action `USER_SIGN_IN_FAILED` created

### 7.2 Sign-Out Audit Logging
- [ ] Sign-out logged to AuditLog
- [ ] Audit action `USER_SIGN_OUT` created
- [ ] Server-side sign-out API created for logging

### 7.3 Verification
- [ ] Build passes
- [ ] Audit logs queryable via existing `/api/audit-logs` endpoint

---

## LAYER 8: HttpOnly Cookies & Portal Switcher ⬜

### 8.1 HttpOnly Cookies
- [ ] `continuum-role` cookie set with `httpOnly: true`
- [ ] `continuum-roles` cookie set with `httpOnly: true`
- [ ] Middleware still reads cookies server-side (unaffected)

### 8.2 Portal Switcher API-Only
- [ ] `portal-switcher.tsx` no longer reads cookies client-side
- [ ] Uses `/api/auth/me` or `/api/employees/me` API call only
- [ ] Loading state while fetching roles
- [ ] Build passes

---

## LAYER 9: Employee Approval Workflow ⬜

### 9.1 Pending Status
- [ ] Employees joining via code get `pending_approval` status (not immediately `active`)
- [ ] `pending_approval` employees blocked in `auth-guard.ts`
- [ ] Clear error message: "Your account is pending HR approval"

### 9.2 HR Approval API
- [ ] `POST /api/hr/approve-employee` endpoint
- [ ] Accepts `{ employeeId, action: 'approve' | 'reject', reason? }`
- [ ] Approved → status changes to `active` + welcome email sent
- [ ] Rejected → status changes to `rejected` + rejection email sent

### 9.3 HR Notification
- [ ] When employee joins, notification sent to HR
- [ ] Uses existing notification system or email

### 9.4 HR Portal UI
- [ ] "Pending Approvals" section in HR dashboard
- [ ] Shows list of pending employees
- [ ] Approve/Reject buttons with confirmation
- [ ] Build passes

---

## LAYER 10: Employee Invite System ⬜

### 10.1 Invite Model
- [ ] `EmployeeInvite` model in Prisma schema (or use existing if any)
- [ ] Fields: `id`, `company_id`, `email`, `role`, `department`, `token`, `expires_at`, `used_at`
- [ ] Prisma migration generated and applied

### 10.2 Invite API
- [ ] `POST /api/hr/invite` - HR can invite employee by email
- [ ] Generates unique invite token (UUID or crypto)
- [ ] Sends invite email with sign-up link
- [ ] `GET /api/invite/[token]` - Validates invite token

### 10.3 Sign-Up with Invite
- [ ] Sign-up page accepts `?invite=TOKEN` query param
- [ ] If valid invite, pre-fills role/department
- [ ] Bypasses company code requirement
- [ ] Invite marked as `used` after sign-up
- [ ] Build passes

### 10.4 Invite Expiry
- [ ] Invites expire after 7 days
- [ ] Expired invites return clear error
- [ ] HR can resend/revoke invites

---

## LAYER 11: RBAC Override Refinement ⬜

### 11.1 Additive Override Logic
- [ ] `getUserPermissions()` merges DB overrides with defaults
- [ ] If company has custom permissions, they ADD to defaults (not replace)
- [ ] OR: Complete replacement with UI enforcing full permission set

### 11.2 Verification
- [ ] Setting one custom permission doesn't wipe defaults
- [ ] Build passes

---

## LAYER 12: Secondary Role Management UI ⬜

### 12.1 HR Employees Page Enhancement
- [ ] Employee list shows current primary + secondary roles
- [ ] "Manage Roles" button opens modal/drawer
- [ ] Modal shows role checkboxes (primary is radio, secondary are checkboxes)
- [ ] Save calls `PUT /api/employees/[id]/role` (already exists)

### 12.2 Verification
- [ ] Admin can add secondary roles to employee
- [ ] Portal switcher reflects new roles
- [ ] Build passes

---

## LAYER 13: Session Management ⬜

### 13.1 Session Tracking
- [ ] `Session` model in Prisma (or use auth provider's sessions)
- [ ] Track `employee_id`, `created_at`, `last_active`, `ip_address`, `user_agent`

### 13.2 Admin Session View
- [ ] `GET /api/admin/sessions` - List all active sessions
- [ ] Shows employee name, IP, last active, device
- [ ] Admin portal page to view sessions

### 13.3 Force Logout
- [ ] `DELETE /api/admin/sessions/[id]` - Force logout session
- [ ] `DELETE /api/admin/sessions/employee/[employeeId]` - Force logout all sessions for employee
- [ ] Revokes tokens/clears cookies server-side
- [ ] Build passes

---

## PROGRESS SUMMARY - PHASE 2

| Layer | Description | Status | Items |
|-------|-------------|--------|-------|
| Layer 6 | Join Code Collision | ⬜ Pending | 5 |
| Layer 7 | Auth Event Audit | ⬜ Pending | 8 |
| Layer 8 | HttpOnly Cookies | ⬜ Pending | 5 |
| Layer 9 | Approval Workflow | ⬜ Pending | 10 |
| Layer 10 | Invite System | ⬜ Pending | 12 |
| Layer 11 | RBAC Refinement | ⬜ Pending | 3 |
| Layer 12 | Secondary Roles UI | ⬜ Pending | 4 |
| Layer 13 | Session Management | ⬜ Pending | 8 |
| **Total Phase 2** | | | **55** |
