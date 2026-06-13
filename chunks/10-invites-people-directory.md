# C10 — Invites, People & Directory

**Priority:** P1 | **Routes:** invite flows, `/api/company/invite-user/*`, directory

**User:** HR invites employees; invitee accepts token; directory search.  
**Connects:** C03 employee onboarding, RBAC role assignment.  
**Defects:** Resend invite, credentials editor, FK normalization (see global-user-invite tests).  
**Recovery:** Expired invite → reissue from HR; audit resend actions.  
**Tests:** `flow-chunk-c2-invites.test.ts`, `invite-accept-flow.test.ts`
