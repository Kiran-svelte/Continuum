# Zero UI v1 Action Catalog

**Status: ENABLED.** G1–G6 sign-off gates completed. WhatsApp delivery is live for verified tenants.

Multi-company routing rule: inbound WhatsApp messages resolve the receiving company from Meta `phone_number_id` before looking up the sender's `ChannelIdentityLink`. Sender identity is never resolved globally across companies.

| Gate | Description | Status |
|------|-------------|--------|
| G1 | Build + typecheck clean | ✅ Signed off |
| G2 | Auth hardened (JWT, refresh symmetry, no Supabase) | ✅ Signed off |
| G3 | Module gating consistent (nav + middleware + API + assistant) | ✅ Signed off |
| G4 | No hard-coded secrets, safe redirects, session symmetry | ✅ Signed off |
| G5 | Inbound webhook + HMAC-SHA256 verification | ✅ Signed off |
| G6 | Outbound send via encrypted token + audit trail | ✅ Signed off |



## Common Rules

- Mutations require a draft summary and explicit Confirm/Cancel.
- Execution uses `AssistantExecutionContext` and `web/lib/services/*`; no cookie-forwarded assistant HTTP calls.
- Error code to user message mapping is deterministic and never exposes other employee PII.
- Deep link base is `{base}/{portalSlug}` unless noted.

## A1 - Request Leave

Permissions: `leave.apply_own`; Module: `leave`; Service: `submitLeaveService`.

Example phrases: request leave; apply for CL; book sick leave tomorrow; I need PL next week; half day today; casual leave Monday; apply SL for 2 days; take leave from July 1 to 3; need a day off Friday; request earned leave.

Multi-turn script: User says "I need leave tomorrow"; bot asks leave type, dates, and reason; bot shows summary; user replies Confirm; bot submits through `submitLeaveService`.

Confirm/Cancel copy: `Reply CONFIRM to submit or CANCEL to discard.`

Success message: `Leave request submitted.`

Error code mapping: `INSUFFICIENT_BALANCE` -> not enough balance; `MODULE_DISABLED` -> leave is not enabled; `COMPANY_SETUP_INCOMPLETE` -> complete company setup first.

Deep link: `{base}/{portalSlug}/request-leave`.

## A2 - Leave Balance

Permissions: `leave.apply_own`; Module: `leave`; Service: `getLeaveBalancesService`.

Example phrases: leave balance; how many CL left; check my balance; remaining sick leave; PL available; show balances; how much leave do I have; CL remaining; balance for casual leave; what is my leave quota.

Multi-turn script: User asks balance; bot reads the service result and replies with current balances. No confirmation.

Confirm/Cancel copy: not required.

Success message: `Your leave balances ({year}): ...`

Error code mapping: `MODULE_DISABLED` -> leave is not enabled; `FORBIDDEN` -> you cannot view this balance.

Deep link: `{base}/{portalSlug}/leave-history`.

## A3 - My Leaves

Permissions: `leave.apply_own`; Module: `leave`; Service: `listOwnLeavesService`.

Example phrases: my leaves; pending requests; show leave history; list my leaves; leave status; approved leaves; rejected leaves; upcoming leave; pending leave; last leave request.

Multi-turn script: User asks for leave list; bot returns own recent leave rows. No confirmation.

Confirm/Cancel copy: not required.

Success message: `Here are your recent leave requests.`

Error code mapping: `MODULE_DISABLED` -> leave is not enabled; `FORBIDDEN` -> own leave access is unavailable.

Deep link: `{base}/{portalSlug}/leave-history`.

## A4 - Cancel Leave

Permissions: `leave.apply_own`; Module: `leave`; Service: `cancelLeaveService`.

Example phrases: cancel my leave; cancel tomorrow leave; withdraw leave request; remove pending leave; cancel CL; discard leave; cancel next week leave; undo my leave; cancel request id; withdraw absence.

Multi-turn script: User requests cancel; bot identifies an own pending leave; bot asks Confirm; service cancels only after confirmation.

Confirm/Cancel copy: `Reply CONFIRM to cancel this leave or CANCEL to keep it.`

Success message: `Leave request cancelled.`

Error code mapping: `NOT_FOUND` -> no cancellable leave found; `FORBIDDEN` -> only pending own leave can be cancelled.

Deep link: `{base}/{portalSlug}/leave-history`.

## A5 - Pending Approvals

Permissions: `leave.approve_team` or `leave.approve_any`; Module: `leave`; Service: `listPendingApprovalsService`.

Example phrases: pending approvals; approvals waiting; my approval queue; team leaves to approve; leave approvals; manager pending leaves; pending team requests; approval list; show requests; who needs approval.

Multi-turn script: Manager asks; bot lists assigned pending requests. No confirmation.

Confirm/Cancel copy: not required.

Success message: `You have {n} pending requests.`

Error code mapping: `FORBIDDEN` -> approval access is unavailable; `MODULE_DISABLED` -> leave is not enabled.

Deep link: `{base}/manager/approvals` or `{base}/{portalSlug}/leave-requests`.

## A6 - Approve Or Reject Leave

Permissions: `leave.approve_team` or `leave.approve_any`; Module: `leave`; Service: `approveLeaveService` or `rejectLeaveService`.

Example phrases: approve leave; reject leave; approve Priya leave; reject request 2; approve pending; reject CL; approve Riya; deny leave; accept team leave; reject due coverage.

Multi-turn script: User asks approve/reject; bot selects or asks which request; bot shows summary; user replies Confirm; service writes the decision.

Confirm/Cancel copy: `Reply CONFIRM to approve/reject or CANCEL to discard.`

Success message: `Recorded your approval` or `Rejected leave.`

Error code mapping: `FORBIDDEN` -> not your approval scope; `NOT_FOUND` -> request not pending; `MODULE_DISABLED` -> leave is not enabled.

Deep link: `{base}/manager/approvals` or `{base}/{portalSlug}/leave-requests`.

## A7 - Clock In Or Clock Out

Permissions: `attendance.mark_own`; Module: `attendance`; Service: `clockAttendanceService`.

Example phrases: clock in; clock out; start work; end work; punch in; punch out; check in; check out; WFH clock in; mark attendance.

Multi-turn script: User says clock in/out; service marks attendance. Confirmation is used when the command is ambiguous.

Confirm/Cancel copy: `Reply CONFIRM to mark attendance or CANCEL to discard.`

Success message: `Attendance updated.`

Error code mapping: `ALREADY_CLOCKED_IN` -> already checked in; `ALREADY_CLOCKED_OUT` -> already checked out; `WFH_DISABLED` -> WFH is disabled.

Deep link: `{base}/{portalSlug}/attendance`.

## A8 - Today Attendance

Permissions: `attendance.mark_own`; Module: `attendance`; Service: `getTodayAttendanceService`.

Example phrases: am I checked in; today attendance; attendance status; did I clock in; check today; my attendance today; work hours today; check-in time; check-out time; today's attendance.

Multi-turn script: User asks; bot returns today's status. No confirmation.

Confirm/Cancel copy: not required.

Success message: `Today: checked in at ...`

Error code mapping: `MODULE_DISABLED` -> attendance is not enabled; `NOT_FOUND` -> no attendance record today.

Deep link: `{base}/{portalSlug}/attendance`.

## A9 - Latest Payslip

Permissions: `payroll.view_own`; Module: `payroll`; Service: `getLatestPayslipService`.

Example phrases: my payslip; salary slip; latest payslip; show salary slip; payroll slip; download payslip; last salary; salary document; pay slip link; monthly slip.

Multi-turn script: User asks; bot returns safe metadata and deep link, not raw PDF bytes in chat.

Confirm/Cancel copy: not required.

Success message: `Your latest payslip is ready.`

Error code mapping: `NOT_FOUND` -> no payslip found; `MODULE_DISABLED` -> payroll is not enabled; `FORBIDDEN` -> own payslip access only.

Deep link: `{base}/{portalSlug}/payslips`.

## A10 - Leave Insights

Permissions: read-only own/team scope; Module: `leave`; Service: insight handlers.

Example phrases: why can't I take leave; best dates; team on leave today; my pending count; leave policy; quota conflict; who is off today; risky dates; leave suggestion; explain rejection.

Multi-turn script: User asks; bot reads allowed data and explains. No mutation and no confirmation.

Confirm/Cancel copy: not required.

Success message: `Here is what affects your leave request.`

Error code mapping: `FORBIDDEN` -> cannot view that scope; `MODULE_DISABLED` -> leave is not enabled.

Deep link: `{base}/{portalSlug}/leave-history` or manager approval pages by role.
