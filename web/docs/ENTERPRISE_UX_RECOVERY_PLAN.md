# Enterprise UX Recovery Plan

Source: production feedback (2026-06-14) — reporting structure, nav redirects, unstable UI.

## P0 — Fixed in this release (wave 2 — global)

| ID | Issue | Fix |
|----|-------|-----|
| UX-09 | Nav changed but pages unchanged (inline legacy routes) | Middleware 308 `/manager/people` → `/manager/team`; server redirect on people page |
| UX-10 | Directory hidden when `directory` module off | Directory nav + API gated on **employees** module (always on) |
| UX-11 | HR employees quick-invite skipped reporting manager | Quick invite routes to `/hr/employees/invite` (full form) |
| UX-12 | Onboarding invites skipped reporting manager | Auto-assign inviter as `managerId` for non-admin roles |
| UX-13 | Manager team page still used TiltCard wrappers | Removed TiltCard from live team page; added Directory + Invite CTAs |
| UX-14 | Manager dashboard had no path to roster/directory | Leave pulse + empty team state link to My Team / Directory / Invite |

## P0 — Fixed in wave 1

| ID | Issue | Fix |
|----|-------|-----|
| UX-01 | Manager **People** nav redirected to dashboard | Removed broken nav item; added **Invite Team Member**; renamed **Team** → **My Team** |
| UX-02 | Nav prefix collisions (`/manager/team` vs attendance) | `isNavItemActive` + longest-prefix middleware module matching |
| UX-03 | Invites dropped `manager_id` in production | Schema + API + accept path persist reporting manager |
| UX-04 | Invites allowed without reporting manager | Server validation + required field on all invite UIs |
| UX-05 | Manager invite API rejected managers | `/api/company/invite-user` extended for manager/director/team_lead |
| UX-06 | No directory for Admin/HR | `/admin/directory`, `/hr/directory` + nav links |
| UX-07 | Admin People/dashboard missing reporting column | **Reports To** column added |
| UX-08 | TiltCard 3D hover on operational pages | Tilt disabled by default; stable PageHeader |

## P1 — Next sprint

| ID | Issue | Plan |
|----|-------|------|
| UX-09 | Permission-aware nav (`buildPortalNav` permissions unused) | Pass permissions from `/api/auth/me` into layout |
| UX-10 | HR employee detail manager read-only | Add manager edit on employee profile |
| UX-11 | Module hook hardcodes `employees` always on | Align with super-admin module cap |
| UX-12 | Orphan `/manager/payroll-advances` route | Add nav or remove route |
| UX-13 | Admin people-invite direct-auth mode | Reconcile with company invite API or remove mode |
| UX-14 | Full org chart (tree) | New `/hr/org-chart` backed by `manager_id` graph |

## P2 — Enterprise hardening backlog

- Capability-denied pages show in-portal message (not silent redirect)
- Bulk import requires manager column
- Employee POST `/api/employees` require managerId for non-admin roles
- E2E tests: manager team nav, invite with manager, directory visibility
- Remove duplicate `team-view.tsx` mock data path

## Verification checklist

- [ ] Manager: **My Team** loads (not dashboard)
- [ ] Manager: **Invite Team Member** succeeds with reporting manager
- [ ] Admin/HR: **Directory** shows “Reports to …”
- [ ] Admin: People Ops + dashboard show **Reports To**
- [ ] No card tilt on dashboard when moving cursor
- [ ] Production smoke: `continuum.support/api/health/live`
