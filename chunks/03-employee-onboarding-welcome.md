# C03 — Employee Onboarding & Welcome

**Priority:** P1  
**Routes:** `/employee/onboarding`, `/employee/welcome`  
**APIs:** `/api/employee/onboarding`, `/api/onboarding/welcome-sequence`, welcome complete

---

## User story

Invited employee completes profile (phone, address, emergency contact), then optional welcome/tutorial before entering employee portal.

---

## Connections

- Middleware cookies: `COOKIE_EMP_ONBOARDING`, `COOKIE_EMP_WELCOME`
- Company onboarding layout redirects non-admin here (`onboarding/layout.tsx`)
- Tutorial provider (`TutorialProvider`) after welcome

---

## Defects

| ID | Issue |
|----|-------|
| C03-001 | Split routing between company vs employee onboarding must stay strict (admin never sees employee flow) |
| C03-002 | Welcome pending flag must sync across `/api/auth/me` and middleware |

---

## Failure recovery

Profile save fails → show field errors; partial profile blocks portal until `isEmployeeOnboardingComplete`.

---

## Tests

`tests/employee-onboarding-split.test.ts`, `tests/global-onboarding-runtime-impact.test.ts`
