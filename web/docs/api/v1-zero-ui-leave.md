# Zero UI Leave API v1

## Submit Leave

Service: `submitLeaveService(ctx, input)`

Input:

```json
{
  "leave_type": "CL",
  "start_date": "2026-07-01",
  "end_date": "2026-07-01",
  "reason": "Headless request",
  "is_half_day": false
}
```

Guards: company setup complete, `leave.apply_own`, leave module enabled, rate limit, idempotency when `ctx.idempotencyKey` is present.

Success: `{ "id": "...", "status": "pending", "total_days": 1 }`

## Approve Or Reject Leave

Service: `approveLeaveService(ctx, { requestId, action, reason })`

Permissions: `leave.approve_team` within scope or `leave.approve_any`.

Success: `{ "requestId": "...", "status": "approved" }`

## Error Codes

`VALIDATION_ERROR`, `INSUFFICIENT_BALANCE`, `MODULE_DISABLED`, `COMPANY_SETUP_INCOMPLETE`, `FORBIDDEN`, `NOT_FOUND`, `RATE_LIMIT`, `NOTICE_PERIOD`, `CONSTRAINT_VIOLATION`, `OVERLAP_CONFLICT`, `INTERNAL_ERROR`.
