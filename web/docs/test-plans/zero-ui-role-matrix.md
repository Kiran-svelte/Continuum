# Zero UI Role Matrix

Date: 2026-06-15
Status: Draft pending QA initials on release ticket

| ID | Role | Action | Method | Expected HTTP/result | QA |
|----|------|--------|--------|----------------------|----|
| R1 | employee | submit leave | submitLeaveService | ok true | |
| R2 | employee | approve leave | approveLeaveService | ok false 403 | |
| R3 | employee | approve own leave | approveLeaveService | 403 | |
| R4 | manager | approve report | approveLeaveService | ok true | |
| R5 | manager | approve non-report | approveLeaveService | 403 | |
| R6 | hr | approve any | approveLeaveService | ok true | |
| R7 | employee coA | resource coB id | any service | 403 | |
| R8 | employee | double clock in | clockAttendanceService | ALREADY_CLOCKED_IN | |
| R9 | employee | other payslip | getLatestPayslipService | 403 | |
| R10 | admin | GET whatsapp settings | HTTP GET | 200 no token field | |
| R11 | employee | GET whatsapp admin API | HTTP GET | 403 | |
| R12 | manager | pending approvals | listPendingApprovalsService | ok true | |
| R13 | employee | check balance | getLeaveBalancesService | ok true | |
| R14 | employee | module payroll off payslip | getLatestPayslipService | MODULE_DISABLED | |
| R15 | whatsapp | full leave CONFIRM | e2e | LeaveRequest row | |
| R16 | hr | adjust balance | service | ok, out of v1 assistant scope | |
| R17 | employee | list own leaves | listOwnLeavesService | ok empty or own rows only | |
| R18 | manager | list pending empty | listPendingApprovalsService | ok empty array | |
| R19 | admin | module cap enforced | super-admin module API | 403 slugs outside cap | |
| R20 | employee | clock out without in | clockAttendanceService | NOT_CLOCKED_IN | |
| R21 | whatsapp | idempotent leave | channel executor | one row | |
| R22 | whatsapp | unknown number | inbound handler | no PII leak other company | |
| R23 | employee | channel verify wrong code | channel verify API | CODE_LOCKED after 3 | |
| R24 | admin | kill switch | tenant config | no execution | |
| R25 | cron | purge old messages | retention job | count deleted logged | |
| R26 | employee | assistant super_admin block | assistant permissions | denied | |
| R27 | manager | approve escalated | approveLeaveService | ok at correct level | |
| R28 | employee | cancel approved | cancelLeaveService | 403 without cancel_any | |
| R29 | api | company setup incomplete | company setup guard | 403 SETUP_INCOMPLETE | |
| R30 | e2e | sign-off doc all gates PASS | ZERO_UI_PREFLIGHT_SIGNOFF.md | GO | |
| R31 | admin disable leave module | assistant message | processAssistantTurn | MODULE_DISABLED copy | |
| R32 | whatsapp HELP as manager | inbound assistant | role menu | manager actions only | |
| R33 | whatsapp STOP | inbound handler | opt out | no further proactive replies | |
| R34 | hr connect whatsapp | channel verify | link row | active link created | |
| R35 | employee profile link token | channel verify | link-from-web | challenge created | |
| R36 | concurrent approve leave race | approveLeaveService | transaction/idempotency | single terminal state | |
| R37 | idempotency 24h expiry new submit | submitLeaveService | idempotency | new row after expiry | |
| R38 | audit export includes channel field | audit export | csv/json | channel present | |
| R39 | super_admin no assistant | assistant permissions | denied | no employee context | |
| R40 | full preflight CI on main green | GitHub Actions | zero-ui-preflight.yml | green | |

Release QA must initial each executed row before `ZERO_UI_PREFLIGHT_SIGNOFF.md` can move from NO-GO to GO.
