# EXTREME FORENSIC AUDIT: Continuum Actions

This document contains an extreme forensic audit of every action trigger (UI interactions and API endpoints) found in the codebase. Total Actions Found: 1259

| Source File | Line | Trigger Type | Claimed Action | Actual Action | Status |
|---|---|---|---|---|---|
| `d:/projects/Continuum-main-deploy/web/app/(auth)/error.tsx` | 138 | Button click | reset | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/(auth)/error.tsx` | 148 | Button click | () => window.location.href = '/' | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/(auth)/error.tsx` | 165 | Button click | window.location.href = '/auth/forgot-password'}                 >                   Reset Password | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/(auth)/error.tsx` | 171 | Button click | window.open('mailto:support@continuum-hr.com', '_blank')}                 >                   Cont | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/(auth)/forgot-password/page.tsx` | 78 | Button click | setSent(false)}                     className="text-primary hover:text-primary/80 font-medium trans | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/(auth)/forgot-password/page.tsx` | 101 | Form submit | handleSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/(auth)/reset-password/page.tsx` | 184 | Form submit | handleSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/audit-logs/page.tsx` | 184 | Button click | handleRefresh | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/audit-logs/page.tsx` | 247 | Button click | handleSearch | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/audit-logs/page.tsx` | 275 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/audit-logs/page.tsx` | 373 | Button click | () => handlePageChange(pagination.page - 1) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/audit-logs/page.tsx` | 382 | Button click | () => handlePageChange(pagination.page + 1) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/error.tsx` | 32 | Button click | reset | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/people/people-table.tsx` | 120 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/rbac/page.tsx` | 351 | Button click | resetChanges | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/rbac/page.tsx` | 355 | Button click | () => setConfirmModalOpen(true) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/rbac/page.tsx` | 474 | Button click | () => togglePermission(perm, role) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/rbac/page.tsx` | 511 | Button click | () => { setSearchQuery(''); setSelectedModule('all'); | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/rbac/page.tsx` | 566 | Button click | () => setConfirmModalOpen(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/rbac/page.tsx` | 573 | Button click | handleSave | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/system-health/page.tsx` | 247 | Button click | () => setAutoRefresh(!autoRefresh) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/system-health/page.tsx` | 259 | Button click | () => fetchHealth(true) | Calls backend API | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/admin/login/page.tsx` | 176 | Form submit | handleSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/admin/login/page.tsx` | 210 | Button click | () => setShowPassword(!showPassword) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/admin/backup/route.ts` | 15 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/admin/backup/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/admin/capability-owners/route.ts` | 30 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/admin/capability-owners/route.t | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/admin/capability-owners/route.ts` | 83 | API Endpoint (PUT) | Handle PUT request for d:/projects/Continuum-main-deploy/web/app/api/admin/capability-owners/route.t | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/admin/force-logout/route.ts` | 25 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/admin/force-logout/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/admin/health/route.ts` | 15 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/admin/health/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/admin/module-readiness/route.ts` | 13 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/admin/module-readiness/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/admin/org-config/route.ts` | 80 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/admin/org-config/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/admin/org-config/route.ts` | 133 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/admin/org-config/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/admin/rbac/route.ts` | 15 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/admin/rbac/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/admin/rbac/route.ts` | 80 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/admin/rbac/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/admin/recovery-readiness/route.ts` | 10 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/admin/recovery-readiness/route. | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/admin/role-model/route.ts` | 38 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/admin/role-model/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/admin/role-model/route.ts` | 92 | API Endpoint (PUT) | Handle PUT request for d:/projects/Continuum-main-deploy/web/app/api/admin/role-model/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/admin/security/mfa/route.ts` | 10 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/admin/security/mfa/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/admin/test-email/route.ts` | 14 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/admin/test-email/route.ts | API endpoint implementation -> External Service (Email) | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/ai/assistant/route.ts` | 53 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/ai/assistant/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/ai/attrition/route.ts` | 23 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/ai/attrition/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/ai/coaching/route.ts` | 22 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/ai/coaching/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/ai/query/route.ts` | 23 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/ai/query/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/ai/smart-leave/route.ts` | 29 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/ai/smart-leave/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/ai/smart-leave/route.ts` | 81 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/ai/smart-leave/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/approval-hierarchy/route.ts` | 21 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/approval-hierarchy/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/approval-hierarchy/route.ts` | 75 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/approval-hierarchy/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/approval-hierarchy/route.ts` | 200 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/approval-hierarchy/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/approval-hierarchy/route.ts` | 304 | API Endpoint (DELETE) | Handle DELETE request for d:/projects/Continuum-main-deploy/web/app/api/approval-hierarchy/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/attendance/regularize/[id]/route.ts` | 17 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/attendance/regularize/[id]/ro | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/attendance/regularize/route.ts` | 18 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/attendance/regularize/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/attendance/regularize/route.ts` | 173 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/attendance/regularize/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/attendance/regularize/summary/route.ts` | 19 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/attendance/regularize/summary/r | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/attendance/route.ts` | 22 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/attendance/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/attendance/route.ts` | 121 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/attendance/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/audit-logs/route.ts` | 9 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/audit-logs/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/callback/route.ts` | 15 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/auth/callback/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/email-verification/confirm/route.ts` | 7 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/auth/email-verification/confir | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/email-verification/send/route.ts` | 16 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/auth/email-verification/send/r | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/email-verification/status/route.ts` | 8 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/auth/email-verification/status/ | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/failed-login/route.ts` | 20 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/auth/failed-login/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/forgot-password/route.ts` | 18 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/auth/forgot-password/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/invite/route.ts` | 10 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/auth/invite/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/join/route.ts` | 15 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/auth/join/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/me/route.ts` | 21 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/auth/me/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/oauth/[provider]/route.ts` | 7 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/auth/oauth/[provider]/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/password-change/route.ts` | 19 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/auth/password-change/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/profile-sync/route.ts` | 41 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/auth/profile-sync/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/refresh/route.ts` | 15 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/auth/refresh/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/register/route.ts` | 15 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/auth/register/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/reset-password/route.ts` | 22 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/auth/reset-password/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/session/route.ts` | 16 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/auth/session/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/session/route.ts` | 63 | API Endpoint (DELETE) | Handle DELETE request for d:/projects/Continuum-main-deploy/web/app/api/auth/session/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/sign-out/route.ts` | 19 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/auth/sign-out/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/sign-out/route.ts` | 92 | API Endpoint (DELETE) | Handle DELETE request for d:/projects/Continuum-main-deploy/web/app/api/auth/sign-out/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/signin/route.ts` | 20 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/auth/signin/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/signup/route.ts` | 16 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/auth/signup/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/channel/verify/confirm/route.ts` | 58 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/channel/verify/confirm/route.t | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/channel/verify/link-from-web/route.ts` | 18 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/channel/verify/link-from-web/r | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/channel/verify/start/route.ts` | 58 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/channel/verify/start/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/channel/verify/unlink/route.ts` | 10 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/channel/verify/unlink/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/company-roles/[id]/route.ts` | 28 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/company/company-roles/[id]/rout | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/company-roles/[id]/route.ts` | 139 | API Endpoint (PUT) | Handle PUT request for d:/projects/Continuum-main-deploy/web/app/api/company/company-roles/[id]/rout | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/company-roles/[id]/route.ts` | 296 | API Endpoint (DELETE) | Handle DELETE request for d:/projects/Continuum-main-deploy/web/app/api/company/company-roles/[id]/r | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/company-roles/route.ts` | 37 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/company/company-roles/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/company-roles/route.ts` | 157 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/company/company-roles/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/company-roles/templates/route.ts` | 208 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/company/company-roles/templates | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/company-roles/templates/route.ts` | 244 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/company/company-roles/template | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/create/route.ts` | 15 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/company/create/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/holidays/bulk/route.ts` | 14 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/company/holidays/bulk/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/holidays/route.ts` | 15 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/company/holidays/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/holidays/route.ts` | 64 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/company/holidays/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/holidays/route.ts` | 145 | API Endpoint (PUT) | Handle PUT request for d:/projects/Continuum-main-deploy/web/app/api/company/holidays/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/holidays/route.ts` | 258 | API Endpoint (DELETE) | Handle DELETE request for d:/projects/Continuum-main-deploy/web/app/api/company/holidays/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/invite-user/[id]/route.ts` | 21 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/company/invite-user/[id]/rout | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/invite-user/[id]/route.ts` | 162 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/company/invite-user/[id]/route | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/invite-user/[id]/route.ts` | 204 | API Endpoint (DELETE) | Handle DELETE request for d:/projects/Continuum-main-deploy/web/app/api/company/invite-user/[id]/rou | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/invite-user/route.ts` | 32 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/company/invite-user/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/leave-types/route.ts` | 25 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/company/leave-types/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/leave-types/route.ts` | 95 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/company/leave-types/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/leave-types/route.ts` | 272 | API Endpoint (PUT) | Handle PUT request for d:/projects/Continuum-main-deploy/web/app/api/company/leave-types/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/leave-types/route.ts` | 436 | API Endpoint (DELETE) | Handle DELETE request for d:/projects/Continuum-main-deploy/web/app/api/company/leave-types/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/leave-types/templates/route.ts` | 307 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/company/leave-types/templates/r | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/leave-types/templates/route.ts` | 342 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/company/leave-types/templates/ | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/quotas/[id]/route.ts` | 13 | API Endpoint (DELETE) | Handle DELETE request for d:/projects/Continuum-main-deploy/web/app/api/company/quotas/[id]/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/quotas/initialize/route.ts` | 16 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/company/quotas/initialize/rout | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/quotas/route.ts` | 27 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/company/quotas/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/quotas/route.ts` | 128 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/company/quotas/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/roles/route.ts` | 20 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/company/roles/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/roles/route.ts` | 70 | API Endpoint (PUT) | Handle PUT request for d:/projects/Continuum-main-deploy/web/app/api/company/roles/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/settings/route.ts` | 106 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/company/settings/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/settings/route.ts` | 139 | API Endpoint (PUT) | Handle PUT request for d:/projects/Continuum-main-deploy/web/app/api/company/settings/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/settings/search-views/route.ts` | 54 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/company/settings/search-views/r | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/settings/search-views/route.ts` | 84 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/company/settings/search-views/ | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/settings/search-views/route.ts` | 156 | API Endpoint (DELETE) | Handle DELETE request for d:/projects/Continuum-main-deploy/web/app/api/company/settings/search-view | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/company/validate-code/route.ts` | 14 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/company/validate-code/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/compensation/cycles/route.ts` | 20 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/compensation/cycles/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/compensation/cycles/route.ts` | 41 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/compensation/cycles/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/compensation/recommendations/route.ts` | 19 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/compensation/recommendations/ro | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/compensation/recommendations/route.ts` | 45 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/compensation/recommendations/r | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/compensation/recommendations/route.ts` | 103 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/compensation/recommendations/ | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/compliance/pf-report/route.ts` | 38 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/compliance/pf-report/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/compliance/reports/route.ts` | 12 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/compliance/reports/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/course-enrollments/route.ts` | 19 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/course-enrollments/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/course-enrollments/route.ts` | 53 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/course-enrollments/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/course-enrollments/route.ts` | 102 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/course-enrollments/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/courses/route.ts` | 20 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/courses/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/courses/route.ts` | 68 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/courses/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/cron/document-expiry/route.ts` | 35 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/cron/document-expiry/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/cron/learning-overdue/route.ts` | 21 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/cron/learning-overdue/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/cron/leave-accrual/route.ts` | 30 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/cron/leave-accrual/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/cron/leave-sla-breach/route.ts` | 27 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/cron/leave-sla-breach/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/cron/performance-overdue/route.ts` | 24 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/cron/performance-overdue/route | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/cron/probation-check/route.ts` | 25 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/cron/probation-check/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/cron/process-events/route.ts` | 22 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/cron/process-events/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/cron/sla-check/route.ts` | 7 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/cron/sla-check/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/cron/year-end-carry-forward/route.ts` | 26 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/cron/year-end-carry-forward/rou | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/directory/route.ts` | 16 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/directory/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/documents/route.ts` | 38 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/documents/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/documents/route.ts` | 141 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/documents/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/documents/route.ts` | 275 | API Endpoint (PUT) | Handle PUT request for d:/projects/Continuum-main-deploy/web/app/api/documents/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/documents/route.ts` | 412 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/documents/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/documents/route.ts` | 561 | API Endpoint (DELETE) | Handle DELETE request for d:/projects/Continuum-main-deploy/web/app/api/documents/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/documents/upload/route.ts` | 124 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/documents/upload/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/email/test/route.ts` | 14 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/email/test/route.ts | API endpoint implementation -> External Service (Email) | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/email/test/route.ts` | 86 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/email/test/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/employee-movements/route.ts` | 40 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/employee-movements/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/employee-movements/route.ts` | 131 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/employee-movements/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/employee-movements/route.ts` | 221 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/employee-movements/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/employee/dashboard/calendar/route.ts` | 38 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/employee/dashboard/calendar/rou | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/employee/dashboard/kpis/route.ts` | 7 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/employee/dashboard/kpis/route.t | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/employee/dashboard/notifications/route.ts` | 22 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/employee/dashboard/notification | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/employee/dashboard/notifications/route.ts` | 260 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/employee/dashboard/notificati | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/employee/dashboard/summary/route.ts` | 5 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/employee/dashboard/summary/rout | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/employee/notification-preferences/route.ts` | 47 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/employee/notification-preferenc | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/employee/notification-preferences/route.ts` | 86 | API Endpoint (PUT) | Handle PUT request for d:/projects/Continuum-main-deploy/web/app/api/employee/notification-preferenc | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/employee/onboarding/route.ts` | 27 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/employee/onboarding/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/employee/onboarding/route.ts` | 69 | API Endpoint (PUT) | Handle PUT request for d:/projects/Continuum-main-deploy/web/app/api/employee/onboarding/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/employee/payslip/download/route.ts` | 86 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/employee/payslip/download/route | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/employee/payslip/route.ts` | 8 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/employee/payslip/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/employee/profile/route.ts` | 41 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/employee/profile/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/employee/profile/route.ts` | 96 | API Endpoint (PUT) | Handle PUT request for d:/projects/Continuum-main-deploy/web/app/api/employee/profile/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/employee/welcome/complete/route.ts` | 15 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/employee/welcome/complete/rout | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/employees/[id]/role/route.ts` | 26 | API Endpoint (PUT) | Handle PUT request for d:/projects/Continuum-main-deploy/web/app/api/employees/[id]/role/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/employees/[id]/route.ts` | 16 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/employees/[id]/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/employees/[id]/route.ts` | 126 | API Endpoint (PUT) | Handle PUT request for d:/projects/Continuum-main-deploy/web/app/api/employees/[id]/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/employees/[id]/route.ts` | 305 | API Endpoint (DELETE) | Handle DELETE request for d:/projects/Continuum-main-deploy/web/app/api/employees/[id]/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/employees/me/route.ts` | 30 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/employees/me/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/employees/me/route.ts` | 82 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/employees/me/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/employees/route.ts` | 24 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/employees/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/employees/route.ts` | 120 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/employees/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/enterprise/metrics/route.ts` | 6 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/enterprise/metrics/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/exit-checklist/route.ts` | 12 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/exit-checklist/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/exit-checklist/route.ts` | 82 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/exit-checklist/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/exit-checklist/route.ts` | 189 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/exit-checklist/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/exit-checklist/route.ts` | 281 | API Endpoint (DELETE) | Handle DELETE request for d:/projects/Continuum-main-deploy/web/app/api/exit-checklist/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/expenses/route.ts` | 24 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/expenses/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/expenses/route.ts` | 57 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/expenses/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/expenses/route.ts` | 115 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/expenses/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/goals/[id]/route.ts` | 22 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/goals/[id]/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/goals/[id]/route.ts` | 56 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/goals/[id]/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/goals/[id]/route.ts` | 104 | API Endpoint (DELETE) | Handle DELETE request for d:/projects/Continuum-main-deploy/web/app/api/goals/[id]/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/goals/route.ts` | 30 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/goals/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/goals/route.ts` | 69 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/goals/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/health/ready/route.ts` | 28 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/health/ready/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/health/route.ts` | 6 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/health/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/holidays/fetch/route.ts` | 23 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/holidays/fetch/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/adjust-balance/route.ts` | 30 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/hr/adjust-balance/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/approve-registration/route.ts` | 25 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/hr/approve-registration/route. | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/approve-registration/route.ts` | 173 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/hr/approve-registration/route.t | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/attendance/route.ts` | 13 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/hr/attendance/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/attention-required/route.ts` | 5 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/hr/attention-required/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/bulk-import/preview/route.ts` | 14 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/hr/bulk-import/preview/route.t | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/bulk-import/route.ts` | 52 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/hr/bulk-import/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/dashboard/metrics/route.ts` | 12 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/hr/dashboard/metrics/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/dashboard/route.ts` | 51 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/hr/dashboard/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/departments/route.ts` | 13 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/hr/departments/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/employees/export/route.ts` | 20 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/hr/employees/export/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/invites/route.ts` | 26 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/hr/invites/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/invites/route.ts` | 164 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/hr/invites/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/leave-balance-adjust/route.ts` | 33 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/hr/leave-balance-adjust/route. | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/leave-calendar/route.ts` | 48 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/hr/leave-calendar/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/leave-quotas-by-role/route.ts` | 32 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/hr/leave-quotas-by-role/route.t | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/leave-quotas-by-role/route.ts` | 82 | API Endpoint (PUT) | Handle PUT request for d:/projects/Continuum-main-deploy/web/app/api/hr/leave-quotas-by-role/route.t | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/organization/route.ts` | 18 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/hr/organization/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/organization/route.ts` | 127 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/hr/organization/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/organization/route.ts` | 232 | API Endpoint (PUT) | Handle PUT request for d:/projects/Continuum-main-deploy/web/app/api/hr/organization/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/organization/route.ts` | 392 | API Endpoint (DELETE) | Handle DELETE request for d:/projects/Continuum-main-deploy/web/app/api/hr/organization/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/policy/route.ts` | 29 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/hr/policy/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/policy/route.ts` | 141 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/hr/policy/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/settings/route.ts` | 36 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/hr/settings/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/settings/route.ts` | 128 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/hr/settings/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/stats/approval-rates/route.ts` | 7 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/hr/stats/approval-rates/route.t | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/internal/escalate-sla/route.ts` | 24 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/internal/escalate-sla/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/internal/purge-chat-history/route.ts` | 11 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/internal/purge-chat-history/ro | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/interviews/route.ts` | 18 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/interviews/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/interviews/route.ts` | 48 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/interviews/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/invite/accept/route.ts` | 16 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/invite/accept/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/invite/accept/route.ts` | 196 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/invite/accept/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/job-applications/[id]/route.ts` | 19 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/job-applications/[id]/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/job-applications/[id]/route.ts` | 47 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/job-applications/[id]/route.t | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/job-applications/route.ts` | 26 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/job-applications/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/job-applications/route.ts` | 68 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/job-applications/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/job-levels/route.ts` | 16 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/job-levels/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/job-levels/route.ts` | 57 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/job-levels/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/job-levels/route.ts` | 157 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/job-levels/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/job-levels/route.ts` | 256 | API Endpoint (DELETE) | Handle DELETE request for d:/projects/Continuum-main-deploy/web/app/api/job-levels/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/job-postings/route.ts` | 29 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/job-postings/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/job-postings/route.ts` | 77 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/job-postings/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/leaves/approve/[requestId]/route.ts` | 16 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/leaves/approve/[requestId]/rou | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/leaves/approve/[requestId]/route.ts` | 62 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/leaves/approve/[requestId]/rout | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/leaves/balances/route.ts` | 8 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/leaves/balances/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/leaves/bulk-approve/route.ts` | 16 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/leaves/bulk-approve/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/leaves/cancel/[requestId]/route.ts` | 13 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/leaves/cancel/[requestId]/rout | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/leaves/check-constraints/route.ts` | 14 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/leaves/check-constraints/route | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/leaves/encash/[id]/route.ts` | 15 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/leaves/encash/[id]/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/leaves/encash/route.ts` | 21 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/leaves/encash/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/leaves/encash/route.ts` | 153 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/leaves/encash/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/leaves/list/route.ts` | 24 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/leaves/list/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/leaves/reject/[requestId]/route.ts` | 11 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/leaves/reject/[requestId]/rout | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/leaves/route.ts` | 14 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/leaves/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/leaves/submit/route.ts` | 13 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/leaves/submit/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/manager/approvals/[id]/action/route.ts` | 15 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/manager/approvals/[id]/action/ | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/manager/dashboard/team-overview/route.ts` | 17 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/manager/dashboard/team-overview | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/manager/pending-approvals/route.ts` | 7 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/manager/pending-approvals/route | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/notifications/[notifId]/read/route.ts` | 12 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/notifications/[notifId]/read/ | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/notifications/preferences/route.ts` | 55 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/notifications/preferences/route | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/notifications/preferences/route.ts` | 102 | API Endpoint (PUT) | Handle PUT request for d:/projects/Continuum-main-deploy/web/app/api/notifications/preferences/route | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/notifications/read-all/route.ts` | 12 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/notifications/read-all/route. | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/notifications/route.ts` | 17 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/notifications/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/offer-letters/route.ts` | 19 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/offer-letters/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/offer-letters/route.ts` | 45 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/offer-letters/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/offer-letters/route.ts` | 87 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/offer-letters/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/onboarding/checklist/route.ts` | 8 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/onboarding/checklist/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/onboarding/checklist/route.ts` | 24 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/onboarding/checklist/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/onboarding/complete/route.ts` | 121 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/onboarding/complete/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/onboarding/defaults/route.ts` | 9 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/onboarding/defaults/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/onboarding/finalize/route.ts` | 24 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/onboarding/finalize/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/onboarding/holidays/route.ts` | 17 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/onboarding/holidays/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/onboarding/progress/route.ts` | 23 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/onboarding/progress/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/onboarding/step/[step]/route.ts` | 59 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/onboarding/step/[step]/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/onboarding/step/[step]/route.ts` | 144 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/onboarding/step/[step]/route.t | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/onboarding/welcome-sequence/route.ts` | 8 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/onboarding/welcome-sequence/ro | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/ops/operations-readiness/route.ts` | 11 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/ops/operations-readiness/route. | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/ops/startup-readiness/route.ts` | 7 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/ops/startup-readiness/route.ts | API endpoint implementation -> Database Query -> External Service (Payments) | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/payments/create-order/route.ts` | 20 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/payments/create-order/route.ts | API endpoint implementation -> Database Query -> External Service (Payments) | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/payments/verify/route.ts` | 20 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/payments/verify/route.ts | API endpoint implementation -> External Service (Payments) | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/payroll-advances/route.ts` | 41 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/payroll-advances/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/payroll-advances/route.ts` | 95 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/payroll-advances/route.ts | API endpoint implementation -> External Service (Payments) | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/payroll-advances/route.ts` | 163 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/payroll-advances/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/payroll/approve/route.ts` | 18 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/payroll/approve/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/payroll/calculate-preview/route.ts` | 37 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/payroll/calculate-preview/rout | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/payroll/generate/route.ts` | 20 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/payroll/generate/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/payroll/history/route.ts` | 10 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/payroll/history/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/payroll/preflight/route.ts` | 14 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/payroll/preflight/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/payroll/slips/latest/route.ts` | 13 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/payroll/slips/latest/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/payroll/slips/route.ts` | 8 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/payroll/slips/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/payroll/status/route.ts` | 39 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/payroll/status/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/permissions/[id]/route.ts` | 21 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/permissions/[id]/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/permissions/[id]/route.ts` | 69 | API Endpoint (PUT) | Handle PUT request for d:/projects/Continuum-main-deploy/web/app/api/permissions/[id]/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/permissions/[id]/route.ts` | 149 | API Endpoint (DELETE) | Handle DELETE request for d:/projects/Continuum-main-deploy/web/app/api/permissions/[id]/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/permissions/route.ts` | 30 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/permissions/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/permissions/route.ts` | 115 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/permissions/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/profile/route.ts` | 28 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/profile/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/profile/route.ts` | 100 | API Endpoint (PUT) | Handle PUT request for d:/projects/Continuum-main-deploy/web/app/api/profile/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/profile/route.ts` | 207 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/profile/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/profile/route.ts` | 265 | API Endpoint (DELETE) | Handle DELETE request for d:/projects/Continuum-main-deploy/web/app/api/profile/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/reimbursements/route.ts` | 31 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/reimbursements/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/reimbursements/route.ts` | 125 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/reimbursements/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/reimbursements/route.ts` | 222 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/reimbursements/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/reports/attendance-summary/route.ts` | 32 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/reports/attendance-summary/rout | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/reports/builder/route.ts` | 64 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/reports/builder/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/reports/builder/route.ts` | 88 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/reports/builder/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/reports/document-expiry/route.ts` | 30 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/reports/document-expiry/route.t | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/reports/exit-attrition/route.ts` | 29 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/reports/exit-attrition/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/reports/export-bundle/route.ts` | 16 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/reports/export-bundle/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/reports/headcount/route.ts` | 34 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/reports/headcount/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/reports/learning-completion/route.ts` | 23 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/reports/learning-completion/rou | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/reports/leave-summary/pdf/route.ts` | 63 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/reports/leave-summary/pdf/route | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/reports/leave-summary/route.ts` | 20 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/reports/leave-summary/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/reports/payroll-register/route.ts` | 28 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/reports/payroll-register/route. | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/reports/performance-summary/route.ts` | 33 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/reports/performance-summary/rou | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/reports/recruitment-pipeline/route.ts` | 29 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/reports/recruitment-pipeline/ro | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/reports/reimbursement-spend/route.ts` | 27 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/reports/reimbursement-spend/rou | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/reports/travel-spend/route.ts` | 27 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/reports/travel-spend/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/review-cycles/[id]/route.ts` | 22 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/review-cycles/[id]/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/review-cycles/[id]/route.ts` | 53 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/review-cycles/[id]/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/review-cycles/[id]/route.ts` | 86 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/review-cycles/[id]/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/review-cycles/route.ts` | 26 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/review-cycles/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/review-cycles/route.ts` | 60 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/review-cycles/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/review-instances/route.ts` | 21 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/review-instances/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/review-instances/route.ts` | 64 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/review-instances/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/salary-components/route.ts` | 11 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/salary-components/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/salary-components/route.ts` | 54 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/salary-components/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/salary-components/route.ts` | 130 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/salary-components/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/salary-components/route.ts` | 214 | API Endpoint (DELETE) | Handle DELETE request for d:/projects/Continuum-main-deploy/web/app/api/salary-components/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/salary-revisions/route.ts` | 11 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/salary-revisions/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/salary-revisions/route.ts` | 110 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/salary-revisions/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/salary-structures/route.ts` | 68 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/salary-structures/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/salary-structures/route.ts` | 155 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/salary-structures/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/salary-structures/route.ts` | 265 | API Endpoint (DELETE) | Handle DELETE request for d:/projects/Continuum-main-deploy/web/app/api/salary-structures/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/search/global/route.ts` | 48 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/search/global/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/search/route.ts` | 111 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/search/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/security/env-check/route.ts` | 26 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/security/env-check/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/security/otp/route.ts` | 20 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/security/otp/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/security/otp/route.ts` | 83 | API Endpoint (PUT) | Handle PUT request for d:/projects/Continuum-main-deploy/web/app/api/security/otp/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/settings/account-management/route.ts` | 12 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/settings/account-management/rou | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/settings/account-management/route.ts` | 32 | API Endpoint (PUT) | Handle PUT request for d:/projects/Continuum-main-deploy/web/app/api/settings/account-management/rou | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/settings/alerts/route.ts` | 8 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/settings/alerts/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/settings/alerts/route.ts` | 19 | API Endpoint (PUT) | Handle PUT request for d:/projects/Continuum-main-deploy/web/app/api/settings/alerts/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/settings/integrations/route.ts` | 8 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/settings/integrations/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/settings/integrations/route.ts` | 21 | API Endpoint (PUT) | Handle PUT request for d:/projects/Continuum-main-deploy/web/app/api/settings/integrations/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/shifts/route.ts` | 13 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/shifts/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/shifts/route.ts` | 123 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/shifts/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/shifts/route.ts` | 223 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/shifts/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/shifts/route.ts` | 435 | API Endpoint (DELETE) | Handle DELETE request for d:/projects/Continuum-main-deploy/web/app/api/shifts/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/status/public/route.ts` | 9 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/status/public/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/super-admin/companies/[id]/modules/route.ts` | 36 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/super-admin/companies/[id]/modu | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/super-admin/companies/[id]/modules/route.ts` | 73 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/super-admin/companies/[id]/mo | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/super-admin/companies/[id]/resend-credentials/route.ts` | 17 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/super-admin/companies/[id]/res | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/super-admin/companies/[id]/route.ts` | 15 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/super-admin/companies/[id]/rout | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/super-admin/companies/[id]/route.ts` | 185 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/super-admin/companies/[id]/ro | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/super-admin/companies/[id]/route.ts` | 272 | API Endpoint (DELETE) | Handle DELETE request for d:/projects/Continuum-main-deploy/web/app/api/super-admin/companies/[id]/r | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/super-admin/companies/[id]/subscription/route.ts` | 20 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/super-admin/companies/[id]/su | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/super-admin/companies/route.ts` | 23 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/super-admin/companies/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/super-admin/companies/route.ts` | 224 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/super-admin/companies/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/super-admin/user-invites/[id]/route.ts` | 16 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/super-admin/user-invites/[id] | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/super-admin/users/[id]/route.ts` | 16 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/super-admin/users/[id]/route. | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/super-admin/users/[id]/route.ts` | 141 | API Endpoint (DELETE) | Handle DELETE request for d:/projects/Continuum-main-deploy/web/app/api/super-admin/users/[id]/route | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/super-admin/users/route.ts` | 17 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/super-admin/users/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/super-admin/users/route.ts` | 161 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/super-admin/users/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/system/self-heal/route.ts` | 20 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/system/self-heal/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/test-neon/route.ts` | 6 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/test-neon/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/travel-requests/route.ts` | 21 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/travel-requests/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/travel-requests/route.ts` | 59 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/travel-requests/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/travel-requests/route.ts` | 113 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/travel-requests/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/tutorial/progress/route.ts` | 9 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/tutorial/progress/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/tutorial/progress/route.ts` | 51 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/tutorial/progress/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/tutorial/progress/route.ts` | 117 | API Endpoint (DELETE) | Handle DELETE request for d:/projects/Continuum-main-deploy/web/app/api/tutorial/progress/route.ts | API endpoint implementation -> Database Query | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/upload/[category]/route.ts` | 79 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/upload/[category]/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/upload/route.ts` | 48 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/upload/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/webhooks/cashfree/route.ts` | 30 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/webhooks/cashfree/route.ts | API endpoint implementation -> External Service (Payments) | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/webhooks/razorpay/route.ts` | 24 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/webhooks/razorpay/route.ts | API endpoint implementation -> External Service (Payments) | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/webhooks/whatsapp/route.ts` | 5 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/webhooks/whatsapp/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/webhooks/whatsapp/route.ts` | 26 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/webhooks/whatsapp/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/workflows/[id]/action/route.ts` | 27 | API Endpoint (PATCH) | Handle PATCH request for d:/projects/Continuum-main-deploy/web/app/api/workflows/[id]/action/route.t | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/workflows/pending/route.ts` | 20 | API Endpoint (GET) | Handle GET request for d:/projects/Continuum-main-deploy/web/app/api/workflows/pending/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/api/workflows/start/route.ts` | 21 | API Endpoint (POST) | Handle POST request for d:/projects/Continuum-main-deploy/web/app/api/workflows/start/route.ts | API endpoint implementation | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/attendance/page.tsx` | 310 | Button click | () => { setShowRegModal(true); setRegError(''); setRegSuccess(''); | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/attendance/page.tsx` | 319 | Button click | () => handleClock('check_in', false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/attendance/page.tsx` | 329 | Button click | () => handleClock('check_in', true) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/attendance/page.tsx` | 340 | Button click | () => handleClock('check_out') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/attendance/page.tsx` | 378 | Button click | { setError(null); loadAttendance(); loadLeaveBalances(); loadRegularizations(); }}               cl | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/attendance/page.tsx` | 439 | Button click | prevMonth | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/attendance/page.tsx` | 445 | Button click | nextMonth | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/attendance/page.tsx` | 667 | Button click | () => !regSubmitting && setShowRegModal(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/attendance/page.tsx` | 681 | Button click | () => !regSubmitting && setShowRegModal(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/attendance/page.tsx` | 730 | Button click | () => !regSubmitting && setShowRegModal(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/attendance/page.tsx` | 736 | Button click | handleRegSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/documents/page.tsx` | 419 | Button click | loadDocuments | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/documents/page.tsx` | 427 | Button click | handleOpenUpload | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/documents/page.tsx` | 446 | Button click | () => setActiveTab(cat.key) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/documents/page.tsx` | 504 | Button click | loadDocuments | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/documents/page.tsx` | 566 | Button click | () => window.open(doc.url, '_blank') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/documents/page.tsx` | 573 | Button click | () => openEditModal(doc) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/documents/page.tsx` | 576 | Button click | () => setDeleteTarget(doc) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/documents/page.tsx` | 597 | Button click | handleOpenUpload | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/error.tsx` | 32 | Button click | reset | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/exit-checklist/page.tsx` | 211 | Button click | loadChecklists | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/exit-checklist/page.tsx` | 335 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/payslips/page.tsx` | 148 | Button click | () => window.location.reload() | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/payslips/page.tsx` | 270 | Button click | () => setSelectedSlip(slip) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/payslips/page.tsx` | 361 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/profile/page.tsx` | 192 | Button click | startEditing | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/profile/page.tsx` | 242 | Form submit | handleSave | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/profile/page.tsx` | 397 | Button click | () => { setEditing(false); setSaveError(''); | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/profile/page.tsx` | 489 | Button click | Add one now | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/profile/page.tsx` | 518 | Button click | () => setShowBankDetails((v) => !v) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/profile/page.tsx` | 560 | Button click | Add them now | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/profile/page.tsx` | 595 | Button click | Add it now | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/reimbursements/page.tsx` | 270 | Button click | openModal | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/reimbursements/page.tsx` | 320 | Button click | openModal | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/reimbursements/page.tsx` | 416 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/reimbursements/page.tsx` | 458 | Button click | openModal | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/reimbursements/page.tsx` | 526 | Button click | () => setPage(page - 1) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/reimbursements/page.tsx` | 539 | Button click | () => setPage(page + 1) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/reimbursements/page.tsx` | 559 | Button click | () => setShowModal(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/reimbursements/page.tsx` | 566 | Button click | (e) => e.stopPropagation() | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/reimbursements/page.tsx` | 568 | Form submit | handleSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/reimbursements/page.tsx` | 652 | Button click | () => setShowModal(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/settings/page.tsx` | 70 | Button click | () => !disabled && onChange(!value) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/settings/page.tsx` | 289 | Button click | loadSettingsData | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/settings/page.tsx` | 503 | Button click | Unknown Action | Calls backend API | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/profile/whatsapp/page.tsx` | 140 | Button click | startVerify | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/employee/profile/whatsapp/page.tsx` | 144 | Button click | confirmVerify | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/error.tsx` | 101 | Button click | isChunkLoadError ? () => window.location.reload() : reset | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/error.tsx` | 108 | Button click | () => window.location.href = '/' | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/global-error.tsx` | 27 | Button click | () => reset() | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/global-error.tsx` | 30 | Button click | () => window.location.reload() | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/help/page.tsx` | 208 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/help/page.tsx` | 282 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/help/page.tsx` | 306 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approval-config/page.tsx` | 79 | Button click | onAction | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approval-config/page.tsx` | 119 | Button click | () => setIsOpen(!isOpen) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approval-config/page.tsx` | 151 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approval-config/page.tsx` | 328 | Button click | () => setActiveTab('approvals') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approval-config/page.tsx` | 336 | Button click | () => setActiveTab('levels') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approval-config/page.tsx` | 359 | Button click | () => openModal('approval') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approval-config/page.tsx` | 404 | Button click | () => openModal('approval', true, h) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approval-config/page.tsx` | 405 | Button click | () => handleDelete('approval', h.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approval-config/page.tsx` | 425 | Button click | () => openModal('level') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approval-config/page.tsx` | 452 | Button click | () => openModal('level', true, jl) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approval-config/page.tsx` | 453 | Button click | () => handleDelete('level', jl.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approval-config/page.tsx` | 517 | Button click | () => setApprovalModal(m => ({ ...m, isOpen: false | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approval-config/page.tsx` | 518 | Button click | () => handleSave('approval') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approval-config/page.tsx` | 563 | Button click | () => setLevelModal(m => ({ ...m, isOpen: false | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approval-config/page.tsx` | 564 | Button click | () => handleSave('level') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/attendance/page.tsx` | 218 | Button click | () => setActiveTab('daily') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/attendance/page.tsx` | 219 | Button click | () => setActiveTab('regularization') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/attendance/page.tsx` | 250 | Button click | exportAttendanceCsv | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/attendance/page.tsx` | 366 | Button click | () => handleRegAction(req.id, 'approve') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/attendance/page.tsx` | 369 | Button click | () => handleRegAction(req.id, 'reject') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/attendance/page.tsx` | 383 | Button click | () => setRegPagination(p => ({ ...p, page: p.page - 1 | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/attendance/page.tsx` | 385 | Button click | () => setRegPagination(p => ({ ...p, page: p.page + 1 | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/audit-logs/page.tsx` | 379 | Button click | handleExportCSV | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/audit-logs/page.tsx` | 388 | Button click | handleExportPDF | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/audit-logs/page.tsx` | 418 | Button click | handleVerifyChain | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/audit-logs/page.tsx` | 501 | Form submit | handleSearchSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/audit-logs/page.tsx` | 525 | Button click | clearFilters | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/audit-logs/page.tsx` | 541 | Button click | fetchLogs(page)} className="ml-2 text-sm underline hover:no-underline shrink-0">Retry | Calls backend API | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/audit-logs/page.tsx` | 596 | Button click | Clear filters | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/audit-logs/page.tsx` | 627 | Button click | () => hasChanges && toggleRow(log.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/audit-logs/page.tsx` | 781 | Button click | () => setPage(1) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/audit-logs/page.tsx` | 790 | Button click | () => setPage((p) => Math.max(1, p - 1)) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/audit-logs/page.tsx` | 812 | Button click | () => setPage(p) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/audit-logs/page.tsx` | 827 | Button click | () => setPage((p) => Math.min(pagination.pages, p + 1)) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/audit-logs/page.tsx` | 836 | Button click | () => setPage(pagination.pages) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employee-movements/page.tsx` | 493 | Button click | openCreateModal | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employee-movements/page.tsx` | 537 | Button click | () => { setStatusFilter(f.value); setPage(1); | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employee-movements/page.tsx` | 634 | Button click | openCreateModal | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employee-movements/page.tsx` | 707 | Button click | () => handleAction(mov.id, 'approve') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employee-movements/page.tsx` | 717 | Button click | () => handleAction(mov.id, 'reject') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employee-movements/page.tsx` | 787 | Button click | () => handleAction(mov.id, 'approve') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employee-movements/page.tsx` | 798 | Button click | () => handleAction(mov.id, 'reject') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employee-movements/page.tsx` | 816 | Button click | () => setPage((p) => Math.max(1, p - 1)) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employee-movements/page.tsx` | 820 | Button click | () => setPage((p) => Math.min(totalPages, p + 1)) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employee-movements/page.tsx` | 872 | Button click | () => selectEmployee(emp) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employee-movements/page.tsx` | 967 | Button click | () => setShowCreateModal(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employee-movements/page.tsx` | 970 | Button click | handleCreate | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/[id]/page.tsx` | 256 | Button click | Back to Employees | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/[id]/page.tsx` | 264 | Button click | fetchEmployee | Calls backend API | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/[id]/page.tsx` | 280 | Button click | Back to Employees | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/[id]/page.tsx` | 301 | Button click | () => setEditing(!editing) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/[id]/page.tsx` | 370 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/[id]/page.tsx` | 391 | Button click | handleSave | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 520 | Button click | openAddModal | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 524 | Button click | () => router.push('/hr/employees/invite') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 529 | Button click | () => showJoinCode ? setShowJoinCode(false) : fetchJoinCode() | Calls backend API | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 562 | Button click | copyJoinCode | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 579 | Button click | () => setActiveTab('all') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 585 | Button click | () => setActiveTab('pending') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 724 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 733 | Button click | () => openEditModal(emp) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 741 | Button click | () => openDeactivateConfirm(emp) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 782 | Button click | setExpandedEmployeeId(null)}                                   >                                   | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 803 | Button click | () => setPage((p) => Math.max(1, p - 1)) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 812 | Button click | () => setPage((p) => Math.min(totalPages, p + 1)) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 887 | Button click | () => handleApproval(reg.id, 'reject') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 896 | Button click | () => handleApproval(reg.id, 'approve', 'probation') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 904 | Button click | () => handleApproval(reg.id, 'approve', 'active') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 932 | Button click | () => setShowAddModal(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 944 | Button click | () => setShowAddModal(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 1042 | Button click | () => setShowAddModal(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 1045 | Button click | handleAddEmployee | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 1067 | Button click | () => setShowEditModal(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 1081 | Button click | () => setShowEditModal(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 1168 | Button click | () => setShowEditModal(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 1171 | Button click | handleEditEmployee | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 1193 | Button click | () => setShowDeactivateConfirm(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 1223 | Button click | () => setShowDeactivateConfirm(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 1230 | Button click | handleDeactivateEmployee | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 1253 | Button click | () => setShowInviteModal(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 1262 | Button click | (e) => e.stopPropagation() | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 1266 | Button click | () => setShowInviteModal(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 1279 | Form submit | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 1351 | Button click | () => setShowInviteModal(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/error.tsx` | 49 | Button click | reset | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/escalation/page.tsx` | 122 | Button click | fetchEscalated | Calls backend API | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/escalation/page.tsx` | 145 | Button click | fetchEscalated | Calls backend API | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/escalation/page.tsx` | 266 | Button click | () => handleAction(req.id, 'approve') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/escalation/page.tsx` | 276 | Button click | () => handleAction(req.id, 'reject') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/exit-checklist/page.tsx` | 362 | Button click | () => setShowAddModal(true) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/exit-checklist/page.tsx` | 428 | Button click | () => setStatusFilter(f.value) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/exit-checklist/page.tsx` | 540 | Button click | () => setShowAddModal(true) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/exit-checklist/page.tsx` | 589 | Button click | () => handleToggleComplete(checklist) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/exit-checklist/page.tsx` | 662 | Button click | () => handleDelete(checklist.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/exit-checklist/page.tsx` | 750 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/exit-checklist/page.tsx` | 758 | Button click | handleAddChecklist | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/holidays/page.tsx` | 85 | Button click | onAdd | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/holidays/page.tsx` | 126 | Button click | onDismiss | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/holidays/page.tsx` | 175 | Button click | onClose | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/holidays/page.tsx` | 192 | Button click | onClose | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/holidays/page.tsx` | 200 | Form submit | handleSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/holidays/page.tsx` | 243 | Button click | onClose | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/holidays/page.tsx` | 280 | Button click | onClose | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/holidays/page.tsx` | 307 | Button click | onClose | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/holidays/page.tsx` | 315 | Button click | onConfirm | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/holidays/page.tsx` | 466 | Button click | handleAdd | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/holidays/page.tsx` | 507 | Button click | Unknown Action | Calls backend API | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/holidays/page.tsx` | 576 | Button click | () => handleEdit(holiday) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/holidays/page.tsx` | 583 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/holidays/page.tsx` | 619 | Form submit | handleFormSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/learning/courses/new/page.tsx` | 72 | Form submit | handleSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/leave-encashment/page.tsx` | 207 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/leave-encashment/page.tsx` | 272 | Button click | () => loadEncashments(page, statusFilter) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/leave-encashment/page.tsx` | 373 | Button click | () => handleAction(req.id, 'approve') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/leave-encashment/page.tsx` | 383 | Button click | () => handleAction(req.id, 'reject') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/leave-encashment/page.tsx` | 411 | Button click | () => setPage((p) => Math.max(1, p - 1)) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/leave-encashment/page.tsx` | 422 | Button click | () => setPage((p) => Math.min(totalPages, p + 1)) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/organization/page.tsx` | 280 | Button click | openAddModal | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/organization/page.tsx` | 318 | Button click | Retry | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/organization/page.tsx` | 421 | Button click | () => openEditModal(unit) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/organization/page.tsx` | 429 | Button click | () => setDeletingUnit(unit) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/organization/page.tsx` | 467 | Button click | () => toggleDept(dept.name) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/organization/page.tsx` | 534 | Button click | closeModal | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/organization/page.tsx` | 548 | Button click | closeModal | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/organization/page.tsx` | 624 | Button click | closeModal | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/organization/page.tsx` | 630 | Button click | handleFormSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/organization/page.tsx` | 657 | Button click | () => !deleteSubmitting && setDeletingUnit(null) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/organization/page.tsx` | 678 | Button click | () => !deleteSubmitting && setDeletingUnit(null) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/organization/page.tsx` | 684 | Button click | handleDelete | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payroll/page.tsx` | 321 | Button click | downloadCSV | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payroll/page.tsx` | 357 | Button click | () => setSelectedSlip(s) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payroll/page.tsx` | 391 | Button click | () => setSelectedSlip(s) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payroll/page.tsx` | 580 | Button click | () => window.location.reload() | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payroll/page.tsx` | 599 | Button click | fetchRuns | Calls backend API | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payroll/page.tsx` | 602 | Button click | handleGenerate | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payroll/page.tsx` | 633 | Button click | () => setGenerateResult(null) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payroll/page.tsx` | 743 | Button click | handleGenerate | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payroll/page.tsx` | 759 | Button click | () => setExpandedRun(isExpanded ? null : run.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payroll/page.tsx` | 794 | Button click | (e) => e.stopPropagation() | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payroll/page.tsx` | 801 | Button click | () => handleStatusTransition(run.id, action.status) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payroll/page.tsx` | 813 | Button click | () => setRejectRun(run) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payroll/page.tsx` | 879 | Button click | () => setRejectRun(null) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payroll/page.tsx` | 885 | Button click | () => handleReject(rejectRun.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/recruitment/postings/new/page.tsx` | 68 | Form submit | handleSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/reimbursements/page.tsx` | 372 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/reimbursements/page.tsx` | 523 | Button click | () => handleAction(r.id, 'approve') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/reimbursements/page.tsx` | 533 | Button click | () => openRejectModal(r.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/reimbursements/page.tsx` | 546 | Button click | () => handleAction(r.id, 'process') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/reimbursements/page.tsx` | 644 | Button click | () => handleAction(r.id, 'approve') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/reimbursements/page.tsx` | 655 | Button click | () => openRejectModal(r.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/reimbursements/page.tsx` | 669 | Button click | () => handleAction(r.id, 'process') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/reimbursements/page.tsx` | 692 | Button click | () => setPage((p) => Math.max(1, p - 1)) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/reimbursements/page.tsx` | 704 | Button click | () => setPage((p) => Math.min(pagination!.pages, p + 1)) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/reimbursements/page.tsx` | 749 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/reimbursements/page.tsx` | 761 | Button click | confirmReject | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/reports/page.tsx` | 79 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/reports/page.tsx` | 124 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-components/page.tsx` | 399 | Button click | openAddComponent | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-components/page.tsx` | 437 | Button click | () => setActiveTab(tab.key) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-components/page.tsx` | 499 | Button click | fetchComponents | Calls backend API | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-components/page.tsx` | 512 | Button click | openAddComponent | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-components/page.tsx` | 570 | Button click | () => openEditComponent(comp) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-components/page.tsx` | 578 | Button click | () => handleDeleteComponent(comp.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-components/page.tsx` | 622 | Button click | () => openEditComponent(comp) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-components/page.tsx` | 629 | Button click | () => handleDeleteComponent(comp.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-components/page.tsx` | 682 | Button click | () => fetchRevisions(revisionsPage) | Calls backend API | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-components/page.tsx` | 821 | Button click | () => setRevisionsPage((p) => Math.max(1, p - 1)) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-components/page.tsx` | 832 | Button click | () => setRevisionsPage((p) => Math.min(revisionsTotalPages, p + 1)) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-components/page.tsx` | 933 | Button click | () => setShowComponentModal(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-components/page.tsx` | 936 | Button click | handleComponentSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-structures/page.tsx` | 247 | Button click | openAdd | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-structures/page.tsx` | 296 | Button click | fetchStructures | Calls backend API | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-structures/page.tsx` | 303 | Button click | openAdd | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-structures/page.tsx` | 339 | Button click | () => setViewStructure(s) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-structures/page.tsx` | 342 | Button click | () => openEdit(s) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-structures/page.tsx` | 366 | Button click | () => setViewStructure(s) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-structures/page.tsx` | 367 | Button click | () => openEdit(s) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-structures/page.tsx` | 463 | Button click | () => { setFormEmployeeId(e.id); setEmpSearch(`${e.first_name | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-structures/page.tsx` | 571 | Button click | () => setShowModal(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-structures/page.tsx` | 572 | Button click | handleSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/settings/page.tsx` | 100 | Button click | () => !disabled && onChange(!value) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/settings/page.tsx` | 120 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/settings/page.tsx` | 167 | Button click | () => { onSave(val); setEditing(false); | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/settings/page.tsx` | 173 | Button click | { setVal(displayValue); setEditing(false); }}               className="text-xs text-white/60 hover: | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/settings/page.tsx` | 183 | Button click | setEditing(true)}               className="text-xs text-primary hover:underline"             >    | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/settings/page.tsx` | 336 | Button click | Retry | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/settings/page.tsx` | 760 | Button click | Unknown Action | Calls backend API | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/settings/page.tsx` | 793 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/settings/page.tsx` | 803 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/settings/page.tsx` | 812 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts/page.tsx` | 322 | Button click | openAdd | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts/page.tsx` | 376 | Button click | fetchShifts | Calls backend API | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts/page.tsx` | 388 | Button click | openAdd | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts/page.tsx` | 454 | Button click | () => openAssign(s) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts/page.tsx` | 463 | Button click | () => openEdit(s) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts/page.tsx` | 472 | Button click | () => setDeleteShift(s) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts/page.tsx` | 512 | Button click | () => openAssign(s) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts/page.tsx` | 515 | Button click | () => openEdit(s) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts/page.tsx` | 521 | Button click | () => setDeleteShift(s) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts/page.tsx` | 661 | Button click | () => setShowModal(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts/page.tsx` | 664 | Button click | handleSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts/page.tsx` | 722 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts/page.tsx` | 771 | Button click | () => setShowAssignModal(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts/page.tsx` | 774 | Button click | handleAssign | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts/page.tsx` | 805 | Button click | () => setDeleteShift(null) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts/page.tsx` | 812 | Button click | handleDelete | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/invite/accept/[token]/page.tsx` | 209 | Form submit | handleSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/error.tsx` | 52 | Button click | () => reset() | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/team/page.tsx` | 570 | Button click | () => window.location.reload() | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/team/page.tsx` | 753 | Button click | () => onToggleExpand(member.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/not-found.tsx` | 125 | Button click | () => window.history.back() | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/invite-team/page.tsx` | 140 | Form submit | handleInvite | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/invite-team/page.tsx` | 253 | Button click | () => copyToClipboard(user.inviteUrl) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/invite-team/page.tsx` | 267 | Button click | () => copyToClipboard(user.tempPassword!) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/invite-team/page.tsx` | 284 | Button click | Skip for now | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/invite-team/page.tsx` | 290 | Button click | handleComplete | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/onboarding-org-steps.tsx` | 204 | Button click | () => onChange({ ...value, orgModel: model.value | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/onboarding-org-steps.tsx` | 225 | Button click | Add | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/onboarding-org-steps.tsx` | 269 | Button click | () => removeDepartment(dept.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/onboarding-org-steps.tsx` | 292 | Button click | Add | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/onboarding-org-steps.tsx` | 302 | Button click | () => removeLocation(loc.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/onboarding-org-steps.tsx` | 317 | Button click | Add | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/onboarding-org-steps.tsx` | 326 | Button click | () => removeCostCenter(cc.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/onboarding-org-steps.tsx` | 460 | Button click | () => toggle(module.slug) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/page.tsx` | 586 | Button click | removeBlackout(idx)}                   className="text-red-400 hover:text-red-300 ml-2"            | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/page.tsx` | 620 | Button click | + Add Blackout Period | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/page.tsx` | 777 | Button click | () => removeCustomHoliday(idx) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/page.tsx` | 812 | Button click | addCustomHoliday | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/page.tsx` | 820 | Button click | { setShowAddForm(false); setNewHoliday({ name: '', date: '' }); }}               className="text-xs | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/page.tsx` | 830 | Button click | setShowAddForm(true)}           className="text-xs bg-white/10 hover:bg-white/15 text-white/80 px-3 | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/page.tsx` | 1489 | Button click | () => setCurrentStep((s) => s - 1) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/page.tsx` | 1497 | Button click | handleNext | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/steps/step-1-company.tsx` | 294 | Form submit | handleSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/dashboard/action-panel.tsx` | 60 | Button click | handleSync | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/dashboard/action-panel.tsx` | 65 | Button click | handlePurge | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/dashboard/action-panel.tsx` | 70 | Button click | handleMaintenance | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/users/new/page.tsx` | 90 | Button click | () => copyToClipboard(success.inviteUrl) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/users/new/page.tsx` | 113 | Button click | () => copyToClipboard(success.tempPassword!) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/users/new/page.tsx` | 132 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/users/new/page.tsx` | 168 | Form submit | handleSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/support/page.tsx` | 154 | Button click | () => setExpandedFaq(expandedFaq === index ? null : index) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/app/support/page.tsx` | 258 | Button click | startChatRequest | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/actions.tsx` | 102 | Button click | onClick | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/admin/billing-upgrade-button.tsx` | 179 | Button click | () => { void handleUpgrade(); | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/app-layout.tsx` | 93 | Button click | () => setSidebarOpen(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/app-layout.tsx` | 119 | Button click | () => setCollapsed(!collapsed) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/app-layout.tsx` | 125 | Button click | () => setSidebarOpen(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/app-layout.tsx` | 211 | Button click | () => setSidebarOpen(true) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/app-layout.tsx` | 235 | Button click | () => setTheme(theme === 'dark' ? 'light' : 'dark') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/app-layout.tsx` | 261 | Button click | onSignOut | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/app-layout.tsx` | 445 | Button click | () => onRowClick?.(row) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/assistant/continuum-assistant-widget.tsx` | 289 | Button click | () => setOpen(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/assistant/continuum-assistant-widget.tsx` | 331 | Button click | () => setOpen(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/assistant/continuum-assistant-widget.tsx` | 359 | Button click | () => setOpen(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/assistant/continuum-assistant-widget.tsx` | 395 | Button click | confirmPendingAction | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/assistant/continuum-assistant-widget.tsx` | 405 | Button click | cancelPendingAction | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/assistant/continuum-assistant-widget.tsx` | 420 | Button click | sendMessage(s)}                     disabled={loading}                   >                     {s | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/assistant/continuum-assistant-widget.tsx` | 431 | Form submit | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/assistant/continuum-assistant-widget.tsx` | 484 | Button click | () => setOpen((v) => !v) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/global-error-boundary.tsx` | 127 | Button click | this.handleReset | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/global-error-boundary.tsx` | 137 | Button click | this.handleRefresh | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/global-error-boundary.tsx` | 154 | Button click | window.open('mailto:support@continuum-hr.com', '_blank')}                   >                      | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/global-error-boundary.tsx` | 160 | Button click | window.open('/help', '_blank')}                   >                     Help Center | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/global-search-page.tsx` | 355 | Button click | () => void runSearch() | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/global-search-page.tsx` | 359 | Button click | saveCurrentView | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/global-search-page.tsx` | 364 | Button click | () => void saveSharedView() | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/global-search-page.tsx` | 369 | Button click | exportCsv | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/global-search-page.tsx` | 383 | Button click | applyPreset(preset)}                       className="text-xs hover:text-primary transition"       | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/global-search-page.tsx` | 390 | Button click | () => deletePreset(preset.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/global-search-page.tsx` | 410 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/global-search-page.tsx` | 422 | Button click | () => void deleteSharedView(view.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/global-search-page.tsx` | 440 | Button click | () => toggleDomain(domain) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/global-search-page.tsx` | 489 | Button click | () => void runSearch() | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/help-tooltip.tsx` | 56 | Button click | () => setIsOpen(!isOpen) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/help-tooltip.tsx` | 85 | Button click | () => setIsOpen(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/hr/global-search-trigger.tsx` | 27 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/hr/invite-credentials-editor.tsx` | 69 | Form submit | onSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/invite/resend-invite-button.tsx` | 62 | Button click | handleResend | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/layouts/wizard-template.tsx` | 98 | Button click | onBack | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/layouts/wizard-template.tsx` | 107 | Button click | onSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/layouts/wizard-template.tsx` | 115 | Button click | onNext | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/motion/magnetic-button.tsx` | 68 | Button click | handleClick | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/notification-bell.tsx` | 228 | Button click | () => setOpen((o) => !o) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/notification-bell.tsx` | 299 | Button click | Mark all read | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/notification-bell.tsx` | 338 | Button click | () => !notification.is_read && markRead(notification.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/notifications-page.tsx` | 193 | Button click | markAllRead | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/notifications-page.tsx` | 214 | Button click | () => setFilter('all') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/notifications-page.tsx` | 222 | Button click | () => setFilter('unread') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/notifications-page.tsx` | 233 | Button click | () => setTypeFilter('all') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/notifications-page.tsx` | 246 | Button click | () => setTypeFilter(isActive ? 'all' : types[0]) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/notifications-page.tsx` | 284 | Button click | () => !notif.is_read && markAsRead(notif.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/company-settings-view.tsx` | 224 | Button click | () => setActiveTab('general') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/company-settings-view.tsx` | 233 | Button click | () => setActiveTab('time') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/company-settings-view.tsx` | 242 | Button click | () => setActiveTab('notifications') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/company-settings-view.tsx` | 251 | Button click | () => setActiveTab('roles') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/company-settings-view.tsx` | 260 | Button click | () => setActiveTab('capabilities') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/company-settings-view.tsx` | 271 | Button click | () => setActiveTab('org-structure') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/company-settings-view.tsx` | 281 | Button click | () => setActiveTab('approval-chains') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/company-settings-view.tsx` | 291 | Button click | () => setActiveTab('modules') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/company-settings-view.tsx` | 301 | Button click | () => setActiveTab('security') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/company-settings-view.tsx` | 312 | Form submit | handleSave | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/company-settings-view.tsx` | 404 | Button click | handleForceGlobalMfa | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/company-settings-view.tsx` | 439 | Button click | () => handleRoleModelUpgrade(model.key) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/company-settings-view.tsx` | 512 | Button click | () => saveOrgConfig({ orgStructure | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/company-settings-view.tsx` | 536 | Button click | () => saveOrgConfig({ approvalChains | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/company-settings-view.tsx` | 559 | Button click | () => saveOrgConfig({ enabledModules: modules.filter((m) => m.isEnabled).map((m) => m.slug) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/company-settings-view.tsx` | 569 | Button click | handleDiscardChanges | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/login-view.tsx` | 139 | Form submit | handleSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/login-view.tsx` | 173 | Button click | () => setShowPassword(!showPassword) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/people-invite-view.tsx` | 228 | Form submit | handleSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/people-invite-view.tsx` | 244 | Button click | () => setAuthMode('invite') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/people-invite-view.tsx` | 252 | Button click | () => setAuthMode('direct') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/rbac-view.tsx` | 245 | Button click | resetChanges | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/rbac-view.tsx` | 249 | Button click | () => setConfirmModalOpen(true) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/rbac-view.tsx` | 365 | Button click | () => togglePermission(perm, role) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/rbac-view.tsx` | 406 | Button click | () => { setSearchQuery(''); setSelectedModule('all'); | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/rbac-view.tsx` | 463 | Button click | () => setConfirmModalOpen(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/rbac-view.tsx` | 469 | Button click | handleSave | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/setup-wizard-view.tsx` | 399 | Button click | () => void fetchProgress() | Calls backend API | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/startup-readiness-view.tsx` | 83 | Button click | load | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/system-health-view.tsx` | 238 | Button click | () => setAutoRefresh(!autoRefresh) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/system-health-view.tsx` | 250 | Button click | () => fetchHealth(true) | Calls backend API | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/whatsapp-integration-view.tsx` | 66 | Button click | handleConnectWABA | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/whatsapp-integration-view.tsx` | 80 | Button click | handleTestWebhook | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/auth/forgot-password-view.tsx` | 54 | Button click | () => setSent(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/auth/forgot-password-view.tsx` | 81 | Form submit | handleSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/auth/reset-password-view.tsx` | 174 | Form submit | handleSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/auth/sign-up-view.tsx` | 303 | Form submit | handleSignUp | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/attendance-view.tsx` | 311 | Button click | () => { setShowRegModal(true); setRegError(''); setRegSuccess(''); | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/attendance-view.tsx` | 320 | Button click | () => handleClock('check_in', false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/attendance-view.tsx` | 330 | Button click | () => handleClock('check_in', true) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/attendance-view.tsx` | 341 | Button click | () => handleClock('check_out') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/attendance-view.tsx` | 379 | Button click | () => { setError(null); loadAttendance(); loadLeaveBalances(); loadRegularizations(); | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/attendance-view.tsx` | 440 | Button click | prevMonth | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/attendance-view.tsx` | 446 | Button click | nextMonth | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/attendance-view.tsx` | 668 | Button click | () => !regSubmitting && setShowRegModal(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/attendance-view.tsx` | 682 | Button click | () => !regSubmitting && setShowRegModal(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/attendance-view.tsx` | 731 | Button click | () => !regSubmitting && setShowRegModal(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/attendance-view.tsx` | 737 | Button click | handleRegSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/documents-view.tsx` | 160 | Button click | handleExport | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/documents-view.tsx` | 179 | Button click | () => setActiveCategory('identity') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/documents-view.tsx` | 201 | Button click | () => setActiveCategory('financial') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/documents-view.tsx` | 223 | Button click | () => setActiveCategory('policies') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/documents-view.tsx` | 347 | Button click | () => handleDelete(doc.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/exit-checklist-view.tsx` | 211 | Button click | loadChecklists | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/exit-checklist-view.tsx` | 338 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/learning-view.tsx` | 187 | Button click | () => void handleMarkProgress(enrollment.id, pct) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/learning-view.tsx` | 226 | Button click | () => void handleEnroll(course.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/leave-history-view.tsx` | 450 | Button click | () => { setStartDateFilter(''); setEndDateFilter(''); | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/leave-history-view.tsx` | 461 | Button click | handleExportCsv | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/leave-history-view.tsx` | 486 | Button click | () => { setStatusFilter(s); setPage(1); | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/leave-history-view.tsx` | 499 | Button click | () => setShowFilters((v) => !v) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/leave-history-view.tsx` | 591 | Button click | clearFilters | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/leave-history-view.tsx` | 659 | Button click | clearFilters | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/leave-history-view.tsx` | 688 | Button click | () => openDetail(req) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/leave-history-view.tsx` | 744 | Button click | (e) => { e.stopPropagation(); handleCancel(req.id); | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/leave-history-view.tsx` | 773 | Button click | () => setPage((p) => Math.max(1, p - 1)) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/leave-history-view.tsx` | 786 | Button click | () => setPage((p) => Math.min(totalPages, p + 1)) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/leave-history-view.tsx` | 1060 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/leave-history-view.tsx` | 1070 | Button click | closeDetail | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/onboarding-view.tsx` | 139 | Button click | Unknown Action | Calls backend API | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/onboarding-view.tsx` | 170 | Form submit | submit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/payroll-advances-view.tsx` | 183 | Button click | () => setShowForm((v) => !v) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/payroll-advances-view.tsx` | 197 | Form submit | handleSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/payroll-advances-view.tsx` | 224 | Button click | () => setShowForm(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/payroll-advances-view.tsx` | 309 | Button click | () => actOnTeamRequest(row.id, 'approve') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/payroll-advances-view.tsx` | 318 | Button click | () => actOnTeamRequest(row.id, 'reject') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/payslips-view.tsx` | 140 | Button click | () => window.location.reload() | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/payslips-view.tsx` | 262 | Button click | () => setSelectedSlip(slip) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/payslips-view.tsx` | 353 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/performance-view.tsx` | 168 | Button click | () => setActiveTab(tab) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/performance-view.tsx` | 199 | Button click | () => void handleCreateGoal() | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/performance-view.tsx` | 249 | Button click | () => void handleUpdateProgress(goal.id, pct) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/profile-view.tsx` | 133 | Button click | Personal | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/profile-view.tsx` | 134 | Button click | Personal | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/profile-view.tsx` | 135 | Button click | Personal | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/profile-view.tsx` | 216 | Button click | } | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/reimbursements-view.tsx` | 294 | Button click | openModal | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/reimbursements-view.tsx` | 336 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/reimbursements-view.tsx` | 367 | Button click | openModal | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/reimbursements-view.tsx` | 421 | Button click | () => setPage(page - 1) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/reimbursements-view.tsx` | 426 | Button click | () => setPage(page + 1) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/reimbursements-view.tsx` | 444 | Button click | () => setShowModal(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/reimbursements-view.tsx` | 451 | Button click | (e) => e.stopPropagation() | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/reimbursements-view.tsx` | 453 | Form submit | handleSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/reimbursements-view.tsx` | 548 | Button click | () => setShowModal(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/request-leave-view.tsx` | 289 | Form submit | handleSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/settings-view.tsx` | 110 | Button click | () => toggle(event, channel) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/settings-view.tsx` | 123 | Button click | handleSave | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/travel-view.tsx` | 105 | Button click | () => setShowTravelForm((v) => !v) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/travel-view.tsx` | 108 | Button click | () => setShowExpenseForm((v) => !v) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/travel-view.tsx` | 251 | Button click | onCancel | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/travel-view.tsx` | 255 | Form submit | (e) => void handleSubmit(e) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/travel-view.tsx` | 277 | Button click | onCancel | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/travel-view.tsx` | 319 | Button click | onCancel | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/travel-view.tsx` | 323 | Form submit | (e) => void handleSubmit(e) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/travel-view.tsx` | 344 | Button click | onCancel | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/welcome-view.tsx` | 82 | Button click | continueToDashboard | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approval-config-view.tsx` | 105 | Button click | onAction | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approval-config-view.tsx` | 145 | Button click | () => setIsOpen(!isOpen) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approval-config-view.tsx` | 177 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approval-config-view.tsx` | 417 | Button click | () => setActiveTab('approvals') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approval-config-view.tsx` | 425 | Button click | () => setActiveTab('levels') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approval-config-view.tsx` | 448 | Button click | () => openModal('approval') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approval-config-view.tsx` | 493 | Button click | () => openModal('approval', true, h) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approval-config-view.tsx` | 494 | Button click | () => handleDelete('approval', h.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approval-config-view.tsx` | 514 | Button click | () => openModal('level') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approval-config-view.tsx` | 541 | Button click | () => openModal('level', true, jl) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approval-config-view.tsx` | 542 | Button click | () => handleDelete('level', jl.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approval-config-view.tsx` | 609 | Button click | () => setApprovalModal(m => ({ ...m, isOpen: false | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approval-config-view.tsx` | 610 | Button click | () => handleSave('approval') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approval-config-view.tsx` | 655 | Button click | () => setLevelModal(m => ({ ...m, isOpen: false | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approval-config-view.tsx` | 656 | Button click | () => handleSave('level') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approvals-view.tsx` | 281 | Button click | () => { setStatusTab('pending'); setPagination(p => ({ ...p, page: 1 | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approvals-view.tsx` | 293 | Button click | () => { setStatusTab('escalated'); setPagination(p => ({ ...p, page: 1 | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approvals-view.tsx` | 328 | Button click | () => handleBulkAction('approve') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approvals-view.tsx` | 331 | Button click | () => handleBulkAction('reject') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approvals-view.tsx` | 334 | Button click | () => setSelectedIds(new Set()) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approvals-view.tsx` | 414 | Button click | () => handleAction(req.id, 'approve') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approvals-view.tsx` | 417 | Button click | () => handleAction(req.id, 'reject') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approvals-view.tsx` | 433 | Button click | () => setPagination(p => ({ ...p, page: p.page - 1 | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approvals-view.tsx` | 437 | Button click | () => setPagination(p => ({ ...p, page: p.page + 1 | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/attendance-view.tsx` | 238 | Button click | () => setActiveTab('daily') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/attendance-view.tsx` | 239 | Button click | () => setActiveTab('regularization') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/attendance-view.tsx` | 283 | Button click | handleExportCSV | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/attendance-view.tsx` | 405 | Button click | () => handleRegAction(req.id, 'approve') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/attendance-view.tsx` | 408 | Button click | () => handleRegAction(req.id, 'reject') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/attendance-view.tsx` | 422 | Button click | () => setRegPagination(p => ({ ...p, page: p.page - 1 | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/attendance-view.tsx` | 424 | Button click | () => setRegPagination(p => ({ ...p, page: p.page + 1 | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/audit-logs-view.tsx` | 375 | Button click | handleExportCSV | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/audit-logs-view.tsx` | 384 | Button click | handleExportPDF | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/audit-logs-view.tsx` | 414 | Button click | handleVerifyChain | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/audit-logs-view.tsx` | 497 | Form submit | handleSearchSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/audit-logs-view.tsx` | 521 | Button click | clearFilters | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/audit-logs-view.tsx` | 537 | Button click | () => fetchLogs(page) | Calls backend API | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/audit-logs-view.tsx` | 592 | Button click | clearFilters | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/audit-logs-view.tsx` | 623 | Button click | () => hasChanges && toggleRow(log.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/audit-logs-view.tsx` | 777 | Button click | () => setPage(1) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/audit-logs-view.tsx` | 786 | Button click | () => setPage((p) => Math.max(1, p - 1)) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/audit-logs-view.tsx` | 808 | Button click | () => setPage(p) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/audit-logs-view.tsx` | 823 | Button click | () => setPage((p) => Math.min(pagination.pages, p + 1)) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/audit-logs-view.tsx` | 832 | Button click | () => setPage(pagination.pages) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/bulk-import-view.tsx` | 93 | Button click | Download Template | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/bulk-import-view.tsx` | 103 | Button click | () => fileRef.current?.click() | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/bulk-import-view.tsx` | 137 | Button click | } | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/bulk-import-view.tsx` | 187 | Button click | { setFile(null); setSummary(null); setResults([]); setError(null); if (fileRef.current) fileRef.curr | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/compensation-view.tsx` | 80 | Button click | () => setShowCreateForm((v) => !v) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/compensation-view.tsx` | 115 | Button click | () => setShowCreateForm(true) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/compensation-view.tsx` | 193 | Form submit | (e) => void handleSubmit(e) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/compensation-view.tsx` | 213 | Button click | onCancel | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employee-movements-view.tsx` | 492 | Button click | openCreateModal | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employee-movements-view.tsx` | 536 | Button click | () => { setStatusFilter(f.value); setPage(1); | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employee-movements-view.tsx` | 633 | Button click | openCreateModal | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employee-movements-view.tsx` | 706 | Button click | () => handleAction(mov.id, 'approve') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employee-movements-view.tsx` | 716 | Button click | () => handleAction(mov.id, 'reject') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employee-movements-view.tsx` | 786 | Button click | () => handleAction(mov.id, 'approve') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employee-movements-view.tsx` | 797 | Button click | () => handleAction(mov.id, 'reject') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employee-movements-view.tsx` | 815 | Button click | () => setPage((p) => Math.max(1, p - 1)) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employee-movements-view.tsx` | 819 | Button click | () => setPage((p) => Math.min(totalPages, p + 1)) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employee-movements-view.tsx` | 871 | Button click | () => selectEmployee(emp) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employee-movements-view.tsx` | 966 | Button click | () => setShowCreateModal(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employee-movements-view.tsx` | 969 | Button click | handleCreate | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-id-view.tsx` | 281 | Button click | () => router.push('/hr/employees') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-id-view.tsx` | 289 | Button click | fetchEmployee | Calls backend API | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-id-view.tsx` | 305 | Button click | () => router.push('/hr/employees') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-id-view.tsx` | 326 | Button click | () => setEditing(!editing) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-id-view.tsx` | 399 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-id-view.tsx` | 443 | Button click | handleSave | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-invite-view.tsx` | 380 | Button click | () => router.push('/hr/employees') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-invite-view.tsx` | 403 | Button click | () => setMode('single') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-invite-view.tsx` | 414 | Button click | () => setMode('bulk') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-invite-view.tsx` | 476 | Button click | () => copyInviteLink(result.inviteLink!) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-invite-view.tsx` | 489 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-invite-view.tsx` | 498 | Button click | () => router.push('/hr/employees') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-invite-view.tsx` | 514 | Button click | () => setAccountMode('invite') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-invite-view.tsx` | 524 | Button click | () => setAccountMode('direct') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-invite-view.tsx` | 679 | Button click | handleSendInvite | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-invite-view.tsx` | 712 | Button click | () => setBulkAccountMode('invite') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-invite-view.tsx` | 722 | Button click | () => setBulkAccountMode('direct') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-invite-view.tsx` | 781 | Button click | () => csvInputRef.current?.click() | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-invite-view.tsx` | 787 | Button click | handleBulkInvite | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/escalation-view.tsx` | 122 | Button click | fetchEscalated | Calls backend API | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/escalation-view.tsx` | 145 | Button click | fetchEscalated | Calls backend API | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/escalation-view.tsx` | 266 | Button click | () => handleAction(req.id, 'approve') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/escalation-view.tsx` | 276 | Button click | () => handleAction(req.id, 'reject') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/exit-checklist-view.tsx` | 361 | Button click | () => setShowAddModal(true) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/exit-checklist-view.tsx` | 469 | Button click | () => setStatusFilter(f.value) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/exit-checklist-view.tsx` | 578 | Button click | () => setShowAddModal(true) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/exit-checklist-view.tsx` | 627 | Button click | () => handleToggleComplete(checklist) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/exit-checklist-view.tsx` | 700 | Button click | () => handleDelete(checklist.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/exit-checklist-view.tsx` | 797 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/exit-checklist-view.tsx` | 805 | Button click | handleAddChecklist | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/goals-view.tsx` | 165 | Button click | () => setShowCreateModal(true) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/goals-view.tsx` | 335 | Button click | () => setShowCreateModal(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/goals-view.tsx` | 336 | Button click | handleCreateGoal | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/holidays-view.tsx` | 84 | Button click | onAdd | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/holidays-view.tsx` | 125 | Button click | onDismiss | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/holidays-view.tsx` | 174 | Button click | onClose | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/holidays-view.tsx` | 191 | Button click | onClose | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/holidays-view.tsx` | 199 | Form submit | handleSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/holidays-view.tsx` | 242 | Button click | onClose | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/holidays-view.tsx` | 279 | Button click | onClose | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/holidays-view.tsx` | 306 | Button click | onClose | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/holidays-view.tsx` | 314 | Button click | onConfirm | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/holidays-view.tsx` | 465 | Button click | handleAdd | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/holidays-view.tsx` | 506 | Button click | Unknown Action | Calls backend API | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/holidays-view.tsx` | 575 | Button click | () => handleEdit(holiday) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/holidays-view.tsx` | 582 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/holidays-view.tsx` | 618 | Form submit | handleFormSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/job-board-view.tsx` | 244 | Button click | () => handleApply(job.id, job.title) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/learning-view.tsx` | 119 | Button click | setFilterStatus(s)}                 className={`text-xs px-3 py-1.5 rounded-full transition-colors  | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-balance-view.tsx` | 174 | Form submit | handleSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-balance-view.tsx` | 245 | Button click | () => setForm((prev) => ({ ...prev, adjustment: prev.adjustment - 1 | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-balance-view.tsx` | 259 | Button click | () => setForm((prev) => ({ ...prev, adjustment: prev.adjustment + 1 | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-balance-view.tsx` | 291 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-calendar-view.tsx` | 445 | Button click | () => fetchCalendarData(currentDate.getMonth() + 1, currentDate.getFullYear()) | Calls backend API | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-calendar-view.tsx` | 481 | Button click | () => setViewMode('grid') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-calendar-view.tsx` | 484 | Button click | () => setViewMode('list') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-calendar-view.tsx` | 491 | Button click | () => changeMonth(-1) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-calendar-view.tsx` | 494 | Button click | goToToday | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-calendar-view.tsx` | 497 | Button click | () => changeMonth(1) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-calendar-view.tsx` | 503 | Button click | goToToday | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-encashment-view.tsx` | 207 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-encashment-view.tsx` | 272 | Button click | () => loadEncashments(page, statusFilter) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-encashment-view.tsx` | 373 | Button click | () => handleAction(req.id, 'approve') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-encashment-view.tsx` | 383 | Button click | () => handleAction(req.id, 'reject') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-encashment-view.tsx` | 411 | Button click | () => setPage((p) => Math.max(1, p - 1)) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-encashment-view.tsx` | 422 | Button click | () => setPage((p) => Math.min(totalPages, p + 1)) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-quotas-view.tsx` | 95 | Button click | Add Row | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-quotas-view.tsx` | 131 | Button click | () => removeRow(row.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-quotas-view.tsx` | 148 | Button click | } | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 347 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 371 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 430 | Button click | () => { setStatusFilter(f.value); setPage(1); | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 438 | Button click | () => setShowFilters(!showFilters) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 532 | Button click | clearFilters | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 590 | Button click | () => setBulkResult(null) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 632 | Button click | clearFilters | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 680 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 728 | Button click | () => handleAction(req.id, 'approve') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 738 | Button click | () => handleAction(req.id, 'reject') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 758 | Button click | () => setPage((p) => Math.max(1, p - 1)) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 762 | Button click | () => setPage((p) => Math.min(totalPages, p + 1)) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 794 | Button click | () => handleBulkAction('approve') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 804 | Button click | () => handleBulkAction('reject') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 812 | Button click | () => setSelectedIds(new Set()) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 835 | Button click | () => setSelectedRequest(null) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 867 | Button click | () => setSelectedRequest(null) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 1008 | Button click | () => handleAction(selectedRequest.id, 'approve') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 1018 | Button click | () => handleAction(selectedRequest.id, 'reject') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/organization-view.tsx` | 281 | Button click | openAddModal | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/organization-view.tsx` | 319 | Button click | loadData | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/organization-view.tsx` | 422 | Button click | () => openEditModal(unit) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/organization-view.tsx` | 430 | Button click | () => setDeletingUnit(unit) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/organization-view.tsx` | 468 | Button click | () => toggleDept(dept.name) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/organization-view.tsx` | 535 | Button click | closeModal | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/organization-view.tsx` | 550 | Button click | closeModal | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/organization-view.tsx` | 629 | Button click | closeModal | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/organization-view.tsx` | 635 | Button click | handleFormSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/organization-view.tsx` | 662 | Button click | () => !deleteSubmitting && setDeletingUnit(null) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/organization-view.tsx` | 683 | Button click | () => !deleteSubmitting && setDeletingUnit(null) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/organization-view.tsx` | 689 | Button click | handleDelete | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-advances-view.tsx` | 107 | Button click | () => act(row.id, 'approve') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-advances-view.tsx` | 116 | Button click | () => act(row.id, 'reject') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-view.tsx` | 328 | Button click | downloadCSV | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-view.tsx` | 364 | Button click | () => setSelectedSlip(s) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-view.tsx` | 398 | Button click | () => setSelectedSlip(s) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-view.tsx` | 629 | Button click | () => window.location.reload() | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-view.tsx` | 648 | Button click | fetchRuns | Calls backend API | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-view.tsx` | 651 | Button click | () => handleGenerate(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-view.tsx` | 686 | Button click | () => setGenerateResult(null) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-view.tsx` | 735 | Button click | () => setRegularizationWarning(null) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-view.tsx` | 739 | Button click | () => handleGenerate(true) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-view.tsx` | 829 | Button click | () => handleGenerate(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-view.tsx` | 845 | Button click | () => setExpandedRun(isExpanded ? null : run.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-view.tsx` | 880 | Button click | (e) => e.stopPropagation() | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-view.tsx` | 887 | Button click | () => handleStatusTransition(run.id, action.status) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-view.tsx` | 899 | Button click | () => setRejectRun(run) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-view.tsx` | 965 | Button click | () => setRejectRun(null) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-view.tsx` | 971 | Button click | () => handleReject(rejectRun.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/policy-settings-view.tsx` | 157 | Button click | () => setEditing(true) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/policy-settings-view.tsx` | 249 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/policy-settings-view.tsx` | 259 | Button click | () => { setConfig(rule.config); setJsonError(''); setEditing(false); | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/policy-settings-view.tsx` | 352 | Button click | onClose | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/policy-settings-view.tsx` | 368 | Button click | onClose | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/policy-settings-view.tsx` | 377 | Form submit | handleSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/policy-settings-view.tsx` | 476 | Button click | onClose | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/policy-settings-view.tsx` | 510 | Button click | onClose | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/policy-settings-view.tsx` | 533 | Button click | onClose | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/policy-settings-view.tsx` | 536 | Button click | onConfirm | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/policy-settings-view.tsx` | 700 | Button click | handleAdd | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/policy-settings-view.tsx` | 716 | Button click | handleAdd | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/policy-settings-view.tsx` | 784 | Button click | () => handleEdit(lt) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/policy-settings-view.tsx` | 791 | Button click | () => handleDeleteClick(lt) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/policy-settings-view.tsx` | 924 | Button click | () => setActiveTab(tab.key) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reimbursements-view.tsx` | 372 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reimbursements-view.tsx` | 523 | Button click | () => handleAction(r.id, 'approve') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reimbursements-view.tsx` | 533 | Button click | () => openRejectModal(r.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reimbursements-view.tsx` | 546 | Button click | () => handleAction(r.id, 'process') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reimbursements-view.tsx` | 644 | Button click | () => handleAction(r.id, 'approve') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reimbursements-view.tsx` | 655 | Button click | () => openRejectModal(r.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reimbursements-view.tsx` | 669 | Button click | () => handleAction(r.id, 'process') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reimbursements-view.tsx` | 692 | Button click | () => setPage((p) => Math.max(1, p - 1)) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reimbursements-view.tsx` | 704 | Button click | () => setPage((p) => Math.min(pagination!.pages, p + 1)) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reimbursements-view.tsx` | 749 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reimbursements-view.tsx` | 761 | Button click | confirmReject | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/report-builder-view.tsx` | 171 | Button click | () => setSelectedTemplate(template) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/report-builder-view.tsx` | 216 | Button click | onBack | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/report-builder-view.tsx` | 224 | Button click | () => onRun() | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/report-builder-view.tsx` | 228 | Button click | onExport | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/report-builder-view.tsx` | 373 | Button click | () => onPageChange(currentPage - 1) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/report-builder-view.tsx` | 384 | Button click | () => onPageChange(currentPage + 1) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reports-view.tsx` | 153 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reports-view.tsx` | 198 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reviews-view.tsx` | 148 | Button click | () => setShowCreateModal(true) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reviews-view.tsx` | 163 | Button click | () => setShowCreateModal(true) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reviews-view.tsx` | 272 | Button click | () => setShowCreateModal(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reviews-view.tsx` | 273 | Button click | handleCreateCycle | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-components-view.tsx` | 395 | Button click | openAddComponent | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-components-view.tsx` | 433 | Button click | () => setActiveTab(tab.key) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-components-view.tsx` | 495 | Button click | fetchComponents | Calls backend API | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-components-view.tsx` | 508 | Button click | openAddComponent | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-components-view.tsx` | 566 | Button click | () => openEditComponent(comp) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-components-view.tsx` | 574 | Button click | () => handleDeleteComponent(comp.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-components-view.tsx` | 618 | Button click | () => openEditComponent(comp) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-components-view.tsx` | 625 | Button click | () => handleDeleteComponent(comp.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-components-view.tsx` | 678 | Button click | () => fetchRevisions(revisionsPage) | Calls backend API | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-components-view.tsx` | 817 | Button click | () => setRevisionsPage((p) => Math.max(1, p - 1)) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-components-view.tsx` | 828 | Button click | () => setRevisionsPage((p) => Math.min(revisionsTotalPages, p + 1)) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-components-view.tsx` | 930 | Button click | () => setShowComponentModal(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-components-view.tsx` | 933 | Button click | handleComponentSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-structures-view.tsx` | 298 | Button click | openAdd | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-structures-view.tsx` | 367 | Button click | fetchStructures | Calls backend API | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-structures-view.tsx` | 374 | Button click | openAdd | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-structures-view.tsx` | 410 | Button click | () => setViewStructure(s) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-structures-view.tsx` | 413 | Button click | () => openEdit(s) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-structures-view.tsx` | 437 | Button click | () => setViewStructure(s) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-structures-view.tsx` | 438 | Button click | () => openEdit(s) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-structures-view.tsx` | 534 | Button click | () => { setFormEmployeeId(e.id); setEmpSearch(`${e.first_name | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-structures-view.tsx` | 644 | Button click | () => setShowModal(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-structures-view.tsx` | 645 | Button click | handleSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/settings-view.tsx` | 98 | Button click | () => !disabled && onChange(!value) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/settings-view.tsx` | 146 | Button click | () => { onSave(val); setEditing(false); | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/settings-view.tsx` | 152 | Button click | () => { setVal(displayValue); setEditing(false); | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/settings-view.tsx` | 164 | Button click | () => setEditing(true) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/settings-view.tsx` | 319 | Button click | loadAll | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/settings-view.tsx` | 744 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/settings-view.tsx` | 766 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/settings-view.tsx` | 776 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/settings-view.tsx` | 785 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 390 | Button click | openAdd | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 438 | Button click | handleBulkDelete | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 459 | Button click | fetchShifts | Calls backend API | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 471 | Button click | openAdd | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 555 | Button click | () => openAssign(s) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 564 | Button click | () => openEdit(s) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 573 | Button click | () => setDeleteShift(s) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 613 | Button click | () => openAssign(s) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 616 | Button click | () => openEdit(s) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 622 | Button click | () => setDeleteShift(s) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 762 | Button click | () => setShowModal(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 765 | Button click | handleSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 823 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 872 | Button click | () => setShowAssignModal(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 875 | Button click | handleAssign | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 906 | Button click | () => setDeleteShift(null) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 913 | Button click | handleDelete | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/travel-view.tsx` | 188 | Button click | () => void handleTravelAction(req.id, 'approve') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/travel-view.tsx` | 193 | Button click | () => void handleTravelAction(req.id, 'reject') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/travel-view.tsx` | 242 | Button click | () => void handleExpenseAction(expense.id, 'approve') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/travel-view.tsx` | 247 | Button click | () => void handleExpenseAction(expense.id, 'reject') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/approvals-view.tsx` | 523 | Button click | () => setError('') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/approvals-view.tsx` | 541 | Button click | () => setActiveTab(tab.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/approvals-view.tsx` | 589 | Button click | () => { setFilterName(''); setFilterLeaveType('all'); | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/approvals-view.tsx` | 606 | Button click | () => openBulkDialog('approve') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/approvals-view.tsx` | 609 | Button click | () => openBulkDialog('reject') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/approvals-view.tsx` | 633 | Button click | toggleSelectAll | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/approvals-view.tsx` | 693 | Button click | () => setHistoryPage(p => Math.max(1, p - 1)) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/approvals-view.tsx` | 705 | Button click | () => setHistoryPage(p => Math.min(historyPagination.pages, p + 1)) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/approvals-view.tsx` | 738 | Button click | cancelAction | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/approvals-view.tsx` | 741 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/approvals-view.tsx` | 796 | Button click | closeBulkDialog | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/approvals-view.tsx` | 802 | Button click | executeBulkAction | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/approvals-view.tsx` | 824 | Button click | () => onToggleSelect(req.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/approvals-view.tsx` | 855 | Button click | () => onStartAction(req.id, 'reject') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/approvals-view.tsx` | 858 | Button click | () => onStartAction(req.id, 'approve') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/people-invite-view.tsx` | 220 | Form submit | handleSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/performance-view.tsx` | 186 | Button click | () => initFormForInstance(instance) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/performance-view.tsx` | 202 | Button click | () => setRatingInput((prev) => ({ ...prev, [instance.id]: { ...(prev[instance.id] ?? { strengths: '' | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/performance-view.tsx` | 246 | Button click | () => void handleSubmitReview(instance.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/reimbursements-view.tsx` | 325 | Button click | () => loadReimbursements(page, statusFilter) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/reimbursements-view.tsx` | 376 | Button click | () => setError('') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/reimbursements-view.tsx` | 405 | Button click | () => { setStatusFilter(tab.value); setPage(1); | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/reimbursements-view.tsx` | 474 | Button click | () => setPage((p) => Math.max(1, p - 1)) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/reimbursements-view.tsx` | 485 | Button click | () => setPage((p) => Math.min(pagination!.pages, p + 1)) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/reimbursements-view.tsx` | 591 | Button click | () => onAction(request.id, 'approve') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/reimbursements-view.tsx` | 601 | Button click | () => onAction(request.id, 'reject') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/reports-view.tsx` | 764 | Button click | exportCSV | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/reports-view.tsx` | 768 | Button click | exportPDFReport | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/reports-view.tsx` | 808 | Button click | () => setActiveReportTab('leave') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/reports-view.tsx` | 821 | Button click | () => setActiveReportTab('attendance') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/reports-view.tsx` | 864 | Button click | exportAttendanceCSV | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/settings-view.tsx` | 83 | Button click | () => !disabled && onChange(!value) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/settings-view.tsx` | 268 | Button click | loadAll | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/settings-view.tsx` | 459 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/team-attendance-view.tsx` | 503 | Button click | () => fetchData(selectedDate) | Calls backend API | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/team-attendance-view.tsx` | 531 | Button click | goToPreviousDay | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/team-attendance-view.tsx` | 537 | Button click | goToToday | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/team-attendance-view.tsx` | 539 | Button click | handleRefresh | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/team-attendance-view.tsx` | 543 | Button click | goToNextDay | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/team-attendance-view.tsx` | 643 | Button click | () => setActiveTab(id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/team-attendance-view.tsx` | 819 | Button click | () => onAction(request.id, 'approve') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/team-attendance-view.tsx` | 823 | Button click | () => onAction(request.id, 'reject') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/team-calendar-view.tsx` | 150 | Button click | onRetry | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/team-calendar-view.tsx` | 320 | Button click | () => setViewMode('grid') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/team-calendar-view.tsx` | 321 | Button click | () => setViewMode('list') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/team-calendar-view.tsx` | 324 | Button click | () => changeMonth(-1) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/team-calendar-view.tsx` | 325 | Button click | goToToday | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/team-calendar-view.tsx` | 328 | Button click | () => changeMonth(1) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/team-calendar-view.tsx` | 330 | Button click | goToToday | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/onboarding/invite-accept-token-view.tsx` | 259 | Form submit | handleSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/onboarding/onboarding-company-view.tsx` | 98 | Form submit | handleContinue | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/onboarding/onboarding-invite-team-view.tsx` | 249 | Button click | handleSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/onboarding/onboarding-invite-team-view.tsx` | 257 | Button click | addInvite | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/onboarding/onboarding-invite-team-view.tsx` | 286 | Form submit | handleSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/onboarding/onboarding-invite-team-view.tsx` | 313 | Button click | () => removeInvite(index) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/public/help-view.tsx` | 203 | Button click | () => document.getElementById('help-topics')?.scrollIntoView({ behavior: 'smooth' | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/public/help-view.tsx` | 262 | Button click | () => setSelectedArticle({ ...article, sectionTitle: section.title | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/public/help-view.tsx` | 280 | Button click | () => setActiveSection(activeSection === section.id ? null : section.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/public/support-view.tsx` | 157 | Button click | () => setExpandedFaq(expandedFaq === index ? null : index) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/public/support-view.tsx` | 261 | Button click | startChatRequest | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/shared/reporting-tree-view.tsx` | 80 | Button click | () => setOpen((v) => !v) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-id-core-functions-view.tsx` | 143 | Button click | save | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-id-core-functions-view.tsx` | 195 | Button click | () => toggleCap(item.slug) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-id-core-functions-view.tsx` | 207 | Button click | () => toggleEnabled(item.slug) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-id-settings-view.tsx` | 176 | Button click | () => router.push(`/super-admin/companies/${companyId | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-id-settings-view.tsx` | 197 | Form submit | handleSave | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-id-settings-view.tsx` | 279 | Button click | () => setForm(initialForm) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-id-view.tsx` | 281 | Button click | () => router.push(`/super-admin/companies/${companyId | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-id-view.tsx` | 288 | Button click | () => router.push(`/super-admin/companies/${companyId | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-id-view.tsx` | 382 | Button click | resendOwnerCredentials | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-id-view.tsx` | 472 | Button click | () => copyToClipboard(company.joinCode!) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-id-view.tsx` | 547 | Button click | () => router.push(`/super-admin/users?companyId=${companyId | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-id-view.tsx` | 559 | Button click | () => router.push(`/admin/audit-logs?companyId=${companyId | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-id-view.tsx` | 571 | Button click | deleteCompany | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-new-view.tsx` | 242 | Button click | () => router.push('/super-admin/companies') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-new-view.tsx` | 248 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-new-view.tsx` | 290 | Form submit | handleSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-new-view.tsx` | 563 | Button click | () => router.back() | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-view.tsx` | 219 | Button click | () => router.push('/super-admin/companies/new') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-view.tsx` | 283 | Form submit | handleSearch | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-view.tsx` | 320 | Button click | bulkDeleteCompanies | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-view.tsx` | 350 | Button click | () => router.push('/super-admin/companies/new') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-view.tsx` | 449 | Button click | () => router.push(`/super-admin/companies/${company.id | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-view.tsx` | 458 | Button click | () => router.push(`/super-admin/companies/${company.id | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-view.tsx` | 468 | Button click | () => deleteCompany(company) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-view.tsx` | 491 | Button click | () => setPagination(prev => ({ ...prev, page: prev.page - 1 | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-view.tsx` | 498 | Button click | () => setPagination(prev => ({ ...prev, page: prev.page + 1 | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/operations-readiness-view.tsx` | 67 | Button click | load | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/operations-readiness-view.tsx` | 89 | Button click | load | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/users-new-view.tsx` | 143 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/users-new-view.tsx` | 179 | Form submit | handleSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/portal-layout.tsx` | 231 | Button click | () => setSidebarOpen(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/portal-layout.tsx` | 280 | Button click | () => toggleGroup(group.name!) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/portal-layout.tsx` | 306 | Button click | Unknown Action | Calls backend API | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/portal-layout.tsx` | 370 | Button click | () => setSidebarOpen(true) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/portal-switcher.tsx` | 121 | Button click | () => setOpen(!open) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/portal-switcher.tsx` | 137 | Button click | () => switchPortal(portal.href) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/portal-switcher.tsx` | 159 | Button click | () => setOpen(!open) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/portal-switcher.tsx` | 188 | Button click | () => switchPortal(portal.href) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/profile/role-profile-page.tsx` | 298 | Button click | saveProfile | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/profile/role-profile-page.tsx` | 348 | Button click | addOrUpdateEmergencyContact | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/profile/role-profile-page.tsx` | 351 | Button click | deleteEmergencyContact | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/quick-start-guide.tsx` | 162 | Button click | () => setIsOpen(true) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/quick-start-guide.tsx` | 183 | Button click | () => setIsOpen(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/quick-start-guide.tsx` | 190 | Button click | (e) => e.stopPropagation() | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/quick-start-guide.tsx` | 196 | Button click | () => setIsOpen(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/quick-start-guide.tsx` | 268 | Button click | () => markComplete(step.id) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/quick-start-guide.tsx` | 287 | Button click | Don't show again | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/quick-start-guide.tsx` | 295 | Button click | () => setIsOpen(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/sidebar-nav.tsx` | 32 | Button click | onItemClick | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/sign-out-button.tsx` | 49 | Button click | handleSignOut | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/sign-out-button.tsx` | 61 | Button click | handleSignOut | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/super-admin/invite-credentials-editor.tsx` | 65 | Form submit | onSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/super-admin/user-credentials-editor.tsx` | 78 | Form submit | onSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/theme-toggle.tsx` | 20 | Button click | () => setTheme('light') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/theme-toggle.tsx` | 35 | Button click | () => setTheme('dark') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/theme-toggle.tsx` | 50 | Button click | () => setTheme('system') | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/theme-toggle.tsx` | 77 | Button click | cycleTheme | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/tutorial-guide.tsx` | 108 | Button click | handleSkip | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/tutorial-guide.tsx` | 134 | Button click | handleSkip | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/tutorial-guide.tsx` | 195 | Button click | step.action.onClick | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/tutorial-guide.tsx` | 210 | Button click | handlePrev | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/tutorial-guide.tsx` | 221 | Button click | handleSkip | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/tutorial-guide.tsx` | 226 | Button click | handleNext | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/tutorial-guide.tsx` | 345 | Button click | onStartTutorial | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/tutorial-guide.tsx` | 353 | Button click | onSkip | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/tutorial-guide.tsx` | 428 | Button click | () => setShowInfo(!showInfo) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/tutorial-provider.tsx` | 355 | Button click | onSkip | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/tutorial-provider.tsx` | 400 | Button click | onPrev | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/tutorial-provider.tsx` | 413 | Button click | isLastStep ? onComplete : onNext | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/tutorial-provider.tsx` | 457 | Button click | () => startTutorial(tutorial) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/welcome-modal.tsx` | 60 | Button click | handleMaybeLater | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/welcome-modal.tsx` | 78 | Button click | handleMaybeLater | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/welcome-modal.tsx` | 144 | Button click | handleStartTutorial | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/welcome-modal.tsx` | 152 | Button click | Skip for now | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/welcome-modal.tsx` | 193 | Button click | () => startTutorial(tutorial) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/ui/adaptive-field.tsx` | 71 | Button click | () => setIsEditing(true) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/ui/adaptive-field.tsx` | 98 | Button click | handleSave | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/ui/adaptive-field.tsx` | 105 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/ui/animated-sign-in.tsx` | 151 | Button click | } | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/ui/animated-sign-in.tsx` | 162 | Form submit | handleSubmit | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/ui/animated-sign-in.tsx` | 191 | Button click | } | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/ui/animated-sign-in.tsx` | 220 | Button click | () => handleSocialSignIn("github") | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/ui/animated-sign-in.tsx` | 223 | Button click | () => handleSocialSignIn("twitter") | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/ui/animated-sign-in.tsx` | 226 | Button click | () => handleSocialSignIn("linkedin") | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/ui/animations.tsx` | 96 | Button click | onClick | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/ui/animations.tsx` | 213 | Button click | onClick | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/ui/animations.tsx` | 304 | Button click | onToggle | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/ui/command-k.tsx` | 169 | Button click | () => setOpen(true) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/ui/command-k.tsx` | 186 | Button click | () => setOpen(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/ui/command-k.tsx` | 205 | Button click | () => setOpen(false) | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/ui/command-k.tsx` | 242 | Button click | () => { setOpen(false); router.push(item.href); | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/ui/command-k.tsx` | 279 | Button click | () => { setOpen(false); router.push(item.href); | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/ui/empty-state.tsx` | 31 | Button click | action.onClick | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/ui/error-boundary.tsx` | 98 | Button click | resetError | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/ui/error-boundary.tsx` | 108 | Button click | () => window.location.href = '/' | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/ui/error-boundary.tsx` | 135 | Button click | resetError | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/ui/error-boundary.tsx` | 156 | Button click | () => window.location.reload() | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/ui/modal.tsx` | 73 | Button click | closeOnOverlayClick ? onClose : undefined | Executes local function | 🔴 **[FAKE - empty]** |
| `d:/projects/Continuum-main-deploy/web/components/ui/modal.tsx` | 126 | Button click | onClose | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/ui/modal.tsx` | 211 | Button click | onClose | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/ui/modal.tsx` | 218 | Button click | onConfirm | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/ui/modern-stunning-sign-in.tsx` | 198 | Form submit | handleSignIn | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/ui/modern-stunning-sign-in.tsx` | 264 | Button click | Unknown Action | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/ui/save-button.tsx` | 30 | Button click | onSave | Executes local function | 🟢 **[REAL]** |
| `d:/projects/Continuum-main-deploy/web/components/ui/save-button.tsx` | 45 | Button click | onSave | Executes local function | 🟢 **[REAL]** |
