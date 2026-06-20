# CRUD Parity Audit — Role Portals

Audit date: 2026-06-20  
Canonical app root: `web/`

Legend: ✅ complete · ⚠️ partial (fixed in this pass) · ❌ gap remaining

---

## Super Admin

### Companies list (`/super-admin/companies`)
| Field | Value |
|-------|-------|
| **Roles** | `super_admin` |
| **View** | `web/components/pages/super-admin/companies-view.tsx` |
| **API** | `GET/POST /api/super-admin/companies`, `DELETE/PATCH /api/super-admin/companies/[id]` |
| **Create** | ✅ Create Company |
| **Manage** | ✅ View, Edit (settings), Delete (single + bulk, `window.confirm`) |
| **Permission** | `getCurrentUser().role === 'super_admin'` |
| **Confirmation** | Delete uses browser confirm |

### Company detail (`/super-admin/companies/[id]`)
| Field | Value |
|-------|-------|
| **Roles** | `super_admin` |
| **View** | `web/components/pages/super-admin/companies-id-view.tsx` |
| **API** | `GET/DELETE /api/super-admin/companies/[id]`, `POST .../resend-credentials` |
| **Create** | N/A (detail view) |
| **Manage** | ✅ Settings, core functions, resend owner credentials, delete |
| **Permission** | Super admin session |
| **Confirmation** | Delete confirm dialog |

### Users list (`/super-admin/users`)
| Field | Value |
|-------|-------|
| **Roles** | `super_admin` |
| **View** | `web/components/pages/super-admin/users-view.tsx` (page re-export) |
| **API** | `POST/GET /api/super-admin/users`, invite actions via server actions + `user-invites/[id]` |
| **Create** | ✅ Create User |
| **Manage** | ✅ Edit invite, Resend, Revoke pending · View/Edit credentials, Deactivate active |
| **Permission** | Super admin only |
| **Confirmation** | ✅ Revoke + Deactivate use `ConfirmFormButton` |

**Gap fixed:** Page had duplicate stub UI with non-functional Resend/Cancel buttons; now uses `UsersView`.

### User detail (`/super-admin/users/[id]`)
| Field | Value |
|-------|-------|
| **Roles** | `super_admin` |
| **View** | `web/components/pages/super-admin/users-id-view.tsx` |
| **API** | `PATCH/DELETE /api/super-admin/users/[id]` |
| **Create** | N/A |
| **Manage** | ✅ Credential edit · ✅ Deactivate (added) |
| **Permission** | Super admin; DELETE scoped to `invited_by_type: 'super_admin'` |
| **Confirmation** | ✅ `ConfirmDialog` on deactivate |

### Pending invite edit (`/super-admin/users/invites/[id]`)
| Field | Value |
|-------|-------|
| **Roles** | `super_admin` |
| **View** | `web/components/pages/super-admin/users-invites-id-view.tsx` |
| **API** | `PATCH/POST/DELETE /api/super-admin/user-invites/[id]` |
| **Create** | N/A |
| **Manage** | ✅ Edit fields · ✅ Resend · ✅ Revoke |
| **Permission** | Super admin |
| **Confirmation** | ✅ Revoke via `ConfirmDialog` |

**Gap fixed:** Added `DELETE` handler on super-admin invite API.

---

## Admin

### People Operations (`/admin/people`)
| Field | Value |
|-------|-------|
| **Roles** | `admin` |
| **View** | `web/components/pages/admin/people-view.tsx`, `people-table.tsx` |
| **API** | `GET` via server Prisma; `DELETE /api/employees/[id]` for deactivate |
| **Create** | ✅ Provision User → `/admin/people/invite` |
| **Manage** | ✅ View (`/hr/employees/[id]`) · ✅ Deactivate (added) |
| **Permission** | `employee.view_all`; DELETE via employees API guards |
| **Confirmation** | ✅ `ConfirmDialog` on deactivate |

**Gap fixed:** Table was read-only; actions column added.

### Provision User (`/admin/people/invite`)
| Field | Value |
|-------|-------|
| **Roles** | `admin` |
| **View** | `web/components/pages/admin/people-invite-view.tsx` |
| **API** | `POST/GET /api/company/invite-user`, `PATCH/POST/DELETE .../[id]` |
| **Create** | ✅ Invite link + direct credentials |
| **Manage** | ✅ Edit, Resend, Revoke on pending list (added) |
| **Permission** | Admin/HR on company invite routes |
| **Confirmation** | Revoke confirm in shared component |

---

## HR

### Employees (`/hr/employees`)
| Field | Value |
|-------|-------|
| **Roles** | `admin`, `hr` |
| **View** | `web/app/hr/(main)/employees/page.tsx` |
| **API** | `GET/POST /api/employees`, `PUT/DELETE /api/employees/[id]` |
| **Create** | ✅ Add Employee, Invite by Email, Join Code |
| **Manage** | ✅ Edit modal, Deactivate confirm, pending registration approve/reject, profile link |
| **Permission** | `requireRole(admin, hr)` on APIs |
| **Confirmation** | Deactivate modal |

### Invite employees (`/hr/employees/invite`)
| Field | Value |
|-------|-------|
| **Roles** | `admin`, `hr` |
| **View** | `web/components/pages/hr/employees-invite-view.tsx` |
| **API** | `POST /api/company/invite-user`, `GET /api/company/invite-user` |
| **Create** | ✅ Single + bulk invite/direct |
| **Manage** | ✅ Edit, Resend, Revoke on pending (added) |
| **Permission** | Admin/HR |
| **Confirmation** | Revoke confirm |

**Gap fixed:** Pending list used legacy `GET /api/hr/invites` (`employeeInvite`) while creates used `userInvite` — aligned to `GET /api/company/invite-user`.

### Invite edit (`/hr/employees/invite/[id]`)
| Field | Value |
|-------|-------|
| **Roles** | `admin`, `hr`, `manager`, `director`, `team_lead` (expanded) |
| **View** | `web/components/pages/hr/employees-invite-id-view.tsx` |
| **API** | `PATCH/POST/DELETE /api/company/invite-user/[id]` |
| **Manage** | ✅ Full invite CRUD + resend/revoke on editor |
| **Permission** | HR/admin all invites; managers only invites they sent or that report to them |

### Bulk import (`/hr/bulk-import`)
| Field | Value |
|-------|-------|
| **Roles** | `hr` |
| **View** | `web/app/hr/(main)/bulk-import/page.tsx` |
| **Create** | ✅ Import rows |
| **Manage** | ❌ No per-row edit/delete/revert after import |
| **Notes** | Post-import corrections expected via Employees list |

---

## Manager

### My Team (`/manager/team`)
| Field | Value |
|-------|-------|
| **Roles** | `manager` |
| **View** | `web/app/manager/(main)/team/page.tsx` |
| **API** | `GET /api/employees?manager_id=`, leave list |
| **Create** | ✅ Invite Team Member (empty state + header) |
| **Manage** | ⚠️ Read-only roster + expand details; Directory link per member (added). No edit/deactivate (by design — HR/admin) |
| **Permission** | Manager sees direct reports only |
| **Confirmation** | N/A |

### Invite team member (`/manager/people/invite`)
| Field | Value |
|-------|-------|
| **Roles** | `manager`, `director`, `team_lead` |
| **View** | `web/components/pages/manager/people-invite-view.tsx` |
| **API** | `POST/GET /api/company/invite-user`, manage via `[id]` |
| **Create** | ✅ Invite |
| **Manage** | ✅ Edit, Resend, Revoke (added) |
| **Permission** | Manager can manage own invites / direct-report invites |
| **Confirmation** | Revoke confirm |

**Gap fixed:** Pending list endpoint + manager API permissions.

---

## Employee (self-service)

### Profile (`/employee/profile`)
| Field | Value |
|-------|-------|
| **Roles** | `employee` (+ all roles) |
| **View** | `web/app/employee/(main)/profile/page.tsx` |
| **API** | `GET/PATCH /api/employees/me` |
| **Create** | N/A |
| **Manage** | ✅ Edit phone, department, designation, emergency contact, bank (masked), address |
| **Permission** | Self only |
| **Confirmation** | N/A for profile save |

### Request leave / reimbursements / documents
| Field | Value |
|-------|-------|
| **Create** | ✅ Submit flows exist |
| **Manage** | ✅ Cancel/edit where API supports (leave cancel on history); read-only payslips |
| **Notes** | Self-service intentionally limited |

---

## Cross-cutting gaps (remaining work)

| Area | Gap | Priority |
|------|-----|----------|
| HR bulk import | No row-level undo/edit post-import | Low |
| Manager team | No inline status/role edit (escalate to HR) | By design |
| `/api/hr/invites` | Legacy `employeeInvite` model still used by POST; consider deprecation | Medium |
| Admin people table | Deactivate reloads full page; could use optimistic list update | Low |
| Super admin users | Resend server action has no confirm (non-destructive) | OK |
| RBAC page | Capability grant/revoke exists; not part of employee CRUD | Separate |
| Holidays, shifts, salary structures | Create exists in HR/admin; edit/delete varies by module | Future pass |

---

## Fixes applied (2026-06-20)

1. Replaced stub `super-admin/users/page.tsx` with `UsersView` (resend/revoke/deactivate/edit links).
2. Added `DELETE` to `/api/super-admin/user-invites/[id]`.
3. Added `PendingInviteActions` shared component (edit link, resend, revoke + confirm).
4. Wired invite management on admin, HR, manager invite surfaces.
5. Fixed pending-invite list to use `GET /api/company/invite-user` (userInvite parity).
6. Extended company invite `[id]` + list APIs for manager-scoped management.
7. Admin `PeopleTable`: View + Deactivate with confirm.
8. Super-admin user detail: deactivate with confirm.
9. HR employees list: profile link; manager team: directory link.

## Tests added

- `web/tests/crud-parity-audit.test.ts` — static guards for key parity surfaces.
