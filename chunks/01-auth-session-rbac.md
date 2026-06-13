# C01 — Auth, Session, RBAC & Middleware

**Priority:** P0  
**Owner surface:** Sign-in, sign-up, `/api/auth/*`, middleware, server actions in `app/actions/auth.ts`

---

## User story

A company admin signs up, receives JWT cookies, lands on `/onboarding`, saves company setup steps, and completes onboarding without auth errors. HR/manager/employee portals enforce role + module gates on every route and API call.

---

## How it connects

| Upstream | This chunk | Downstream |
|----------|------------|------------|
| Sign-up `/api/auth/signup` | Issues JWT via sign-in flow | C02 onboarding APIs |
| Sign-in `/api/auth/signin` | `setAuthCookies` → `continuum-access` | All portals |
| Middleware `web/middleware.ts` | Edge JWT verify, portal routing | Every page |
| `getAuthEmployee()` | API route guard + permissions | All `/api/*` |
| RBAC `lib/rbac.ts` | Permission codes per role | Nav, `assertModule`, APIs |

---

## Current defects

| ID | Issue | Root cause | Fix |
|----|-------|------------|-----|
| C01-001 | **"Not authenticated. Please sign in." on `/onboarding`** | `app/actions/auth.ts` uses `getSessionFromCookies()` (`continuum-session`) while live auth uses `continuum-access` JWT | Migrate server actions to `getCurrentUser()` |
| C01-002 | `syncUser` looks up `auth_id: session.uid` | Sign-up creates employee **without** `auth_id`; JWT `sub` = `employee.id` | Lookup by `id` first, then email |
| C01-003 | Dead server actions | `syncUser` / `createCompanyAndEmployee` not wired in current onboarding-view but still deployed in older bundles | Keep fixed for backward compatibility |
| C01-004 | Dual cookie names in middleware vs jwt-service | Document single source: `ACCESS_COOKIE_NAME` from `jwt-service` | C15 cleanup |
| C01-005 | Company onboarding layout requires existing employee | Correct for admin post-signup; fails for invite edge cases | Use `/api/company/create` for org-less admins |

---

## Implementation plan

### Phase 1 — JWT-unified server actions (this PR)

1. Replace `getSessionFromCookies` in `app/actions/auth.ts` with `getCurrentUser()`.
2. Add `resolveEmployeeForAuthUser(user)` helper: `findUnique({ id })` → email fallback → optional `auth_id` migration.
3. Return consistent error: `'Not authenticated. Please sign in.'` only when `getCurrentUser()` is null.
4. Add unit test `web/tests/auth-actions-jwt.test.ts` asserting source uses `getCurrentUser`.

### Phase 2 — Client resilience

1. Onboarding view: on `/api/onboarding/*` 401 → redirect `/sign-in?redirect=/onboarding`.
2. Sign-up flow: auto sign-in after signup OR explicit redirect with session refresh.

### Phase 3 — RBAC hardening

1. Audit `requirePermissionGuard` on all onboarding routes (already `employee.onboard`).
2. Ensure company RBAC overrides cannot strip `employee.onboard` from admin during onboarding.

---

## Failure modes & recovery

| Failure | User impact | Detection | Instant recovery |
|---------|-------------|-----------|------------------|
| JWT expired | 401 on APIs, blank data | `/api/auth/me` 401, middleware redirect | `/api/auth/refresh` or re sign-in |
| Missing `AUTH_SECRET` | 500 on all auth | Sentry, `/api/admin/health` | Set env in Vercel, redeploy |
| Neon cold start | Timeouts on first request | Fetch timeout messages | Retry (already 60–120s timeouts in onboarding) |
| Legacy session cookie only | Server action auth fail | C01-001 banner | Phase 1 fix |
| RBAC override removes onboard perm | 403 on onboarding save | API 403 + audit | Reset role permissions in DB / admin RBAC UI |

---

## Files touched (Phase 1)

- `web/app/actions/auth.ts`
- `web/tests/auth-actions-jwt.test.ts`
- `web/components/pages/onboarding/onboarding-view.tsx` (401 redirect)

---

## Test plan

```bash
cd web && npm run test -- tests/auth-actions-jwt.test.ts
cd web && npm run test -- tests/auth-flow.test.ts tests/public-auth-path.test.ts
cd web && npm run build
```

Manual: sign up → land on `/onboarding` → no red auth banner → Save & Continue step 1 succeeds.

---

## Remove / clean (later C15)

- `lib/session.ts` session cookie path if fully superseded by JWT (keep until all callers migrated)
- `app/api/auth/session/route.ts` if unused
- Duplicate `route-enhanced.ts` aliases under onboarding API
