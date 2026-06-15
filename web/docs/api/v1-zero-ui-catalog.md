# Zero UI API Catalog v1

## Authentication

- Web: `continuum-access` session cookie, mapped by `buildContextFromSession`.
- Channel: `ChannelIdentityLink` plus verified external ID, mapped by `buildContextFromLink`.

## Operations

| Operation | Service | Permission | Module |
|-----------|---------|------------|--------|
| `leave.submit` | `submitLeaveService` | `leave.apply_own` | `leave` |
| `leave.balance` | `getLeaveBalancesService` | `leave.apply_own` | `leave` |
| `leave.listOwn` | `listOwnLeavesService` | `leave.apply_own` | `leave` |
| `leave.cancel` | `cancelLeaveService` | `leave.apply_own` | `leave` |
| `leave.pendingApprovals` | `listPendingApprovalsService` | `leave.approve_team` or `leave.approve_any` | `leave` |
| `leave.approve` | `approveLeaveService` | `leave.approve_team` or `leave.approve_any` | `leave` |
| `attendance.clock` | `clockAttendanceService` | `attendance.mark_own` | `attendance` |
| `attendance.today` | `getTodayAttendanceService` | `attendance.mark_own` | `attendance` |
| `payroll.latestPayslip` | `getLatestPayslipService` | `payroll.view_own` | `payroll` |

All operations return `ServiceResult<T>` and must not import `next/headers` or depend on `NextRequest`.
