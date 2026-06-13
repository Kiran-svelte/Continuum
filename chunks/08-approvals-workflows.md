# C08 — Approvals & Workflows

**Priority:** P1 | **Routes:** manager approvals, `/api/manager/*`, workflow explainer

**User:** Manager approves leave/expense/travel/advances in hierarchy.  
**Connects:** Onboarding approval chains (C02), RBAC, notifications.  
**Defects:** Escalation cron must match configured SLA hours.  
**Recovery:** SLA cron escalates; audit log for manual override.  
**Tests:** `workflow-approval-routing.test.ts`, `approval-chain-role-routing.test.ts`
