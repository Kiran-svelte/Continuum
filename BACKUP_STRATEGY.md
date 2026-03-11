# Continuum — Database Backup & Recovery Strategy

## Overview

Continuum uses PostgreSQL hosted on **Supabase** with **Prisma ORM** for data management. This document covers the complete backup, recovery, and disaster response strategy.

---

## 1. Backup Layers

### Layer 1: Supabase Automatic Backups (Infrastructure)

| Plan | Frequency | Retention | PITR |
|------|-----------|-----------|------|
| Free | Daily | 7 days | No |
| Pro ($25/mo) | Daily | 7 days | No |
| Team | Daily | 14 days | Optional add-on |
| Enterprise | Continuous | 30 days | Yes (WAL archiving) |

**How it works**: Supabase runs `pg_dump` nightly. Backups are stored encrypted in Supabase infrastructure.

**Restore**: Supabase Dashboard → Project Settings → Database → Backups → Select date → Restore.

> **Warning**: Restoring replaces the ENTIRE database. There is no table-level restore on Free/Pro plans.

### Layer 2: Application-Level Export (Admin API)

**Endpoint**: `POST /api/admin/backup`

Exports company-scoped data as a downloadable JSON file. Includes:
- Company settings
- Employees (excluding auth_id, bank details)
- Leave types, balances, requests
- Attendance records
- Reimbursements (excluding receipt blobs)
- Documents metadata
- Payroll runs and slips
- Exit checklists
- Audit logs (last 5,000)
- Notifications (last 1,000)

**Excludes** (security): passwords, auth tokens, service keys, binary file content.

**Audit**: Every export is logged in the audit trail with actor, timestamp, and record counts.

### Layer 3: Manual pg_dump (DBA/DevOps)

For full database-level backup with all tables, indexes, and constraints:

```bash
# Full backup
pg_dump "postgresql://postgres.PROJECT_REF:PASSWORD@aws-1-ap-south-1.pooler.supabase.com:5432/postgres" \
  --format=custom \
  --no-owner \
  --file=continuum-$(date +%Y%m%d).dump

# Restore to a different database
pg_restore --no-owner --dbname="postgresql://..." continuum-20260311.dump
```

---

## 2. Disaster Recovery Scenarios

### Scenario A: Accidental Data Deletion

**Example**: HR accidentally deletes an employee record.

**Recovery steps**:
1. **Check soft-delete**: Most records use `deleted_at` — data still exists in DB.
   ```sql
   SELECT * FROM "Employee" WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC;
   ```
2. **Restore from audit log**: The `previous_state` field in `AuditLog` contains the full record before deletion.
   ```sql
   SELECT previous_state FROM "AuditLog"
   WHERE action = 'EMPLOYEE_DELETE' AND entity_id = '<employee_id>'
   ORDER BY created_at DESC LIMIT 1;
   ```
3. **Undo soft-delete**:
   ```sql
   UPDATE "Employee" SET deleted_at = NULL WHERE id = '<employee_id>';
   ```
4. No user-facing downtime. No backup restore needed.

### Scenario B: Corrupt Data (Bad Bulk Update)

**Example**: A bug updates all employees' department to NULL.

**Recovery steps**:
1. **Identify scope**: Check audit logs for the mass update.
   ```sql
   SELECT * FROM "AuditLog"
   WHERE action = 'EMPLOYEE_UPDATE' AND created_at > NOW() - INTERVAL '1 hour'
   ORDER BY created_at DESC;
   ```
2. **Restore from audit `previous_state`**: Each affected row has its pre-update state logged.
3. **Bulk restore script** (build from audit data):
   ```sql
   UPDATE "Employee" SET department = (
     SELECT previous_state->>'department' FROM "AuditLog"
     WHERE entity_type = 'Employee' AND entity_id = "Employee".id
     AND action = 'EMPLOYEE_UPDATE'
     ORDER BY created_at DESC LIMIT 1
   ) WHERE department IS NULL;
   ```
4. If audit data is insufficient: Restore from Supabase daily backup.

### Scenario C: Database Server Failure

**Example**: Supabase region outage.

**Recovery steps**:
1. Supabase handles failover automatically (HA on Pro+ plans).
2. If prolonged: Supabase support restores from backup to a new instance.
3. Update `DATABASE_URL` and `DIRECT_URL` in environment variables.
4. Run `prisma migrate deploy` to verify schema.
5. Restart the application.

### Scenario D: Schema Migration Failure

**Example**: A migration partially applies and leaves the DB in an inconsistent state.

**Recovery steps**:
1. Check migration status:
   ```bash
   npx prisma migrate status
   ```
2. If a migration is marked as "failed":
   ```bash
   npx prisma migrate resolve --rolled-back <migration_name>
   ```
3. Fix the migration SQL, then re-apply:
   ```bash
   npx prisma migrate dev
   ```
4. For production: Never run `migrate dev`. Use `migrate deploy` only.

### Scenario E: Complete Data Loss (Nuclear Option)

**Example**: Database dropped, no Supabase backup available.

**Recovery steps**:
1. Create a new Supabase project.
2. Run `npx prisma migrate deploy` to recreate the schema.
3. Restore from the most recent `POST /api/admin/backup` JSON export:
   - Parse the JSON file
   - Insert records in dependency order: Company → Employees → LeaveTypes → etc.
4. Data loss limited to: changes since last export, auth_ids (users must re-register).

---

## 3. Quarterly Restore Test Procedure

**Schedule**: First Monday of Q1, Q2, Q3, Q4

### Steps:
1. Create a **test Supabase project** (free tier is fine).
2. Download a production backup:
   - Option A: Supabase Dashboard → Backups → Download
   - Option B: `POST /api/admin/backup` → Save JSON
3. Restore to test project:
   ```bash
   # For Supabase backup:
   pg_restore --no-owner --dbname="postgresql://test-project-url" backup.dump

   # For JSON export:
   node scripts/restore-from-json.js backup.json
   ```
4. Verify:
   - [ ] Employee count matches production
   - [ ] Leave balances are correct
   - [ ] Audit chain passes verification (`GET /api/admin/health`)
   - [ ] Can log in and navigate all portals
5. Document results in a test report.
6. Delete the test project.

---

## 4. Health Monitoring

**Endpoint**: `GET /api/admin/health`

Returns real-time system health:

| Check | What it verifies |
|-------|-----------------|
| `database` | PostgreSQL connection alive, server timestamp |
| `audit_chain` | SHA-256 hash chain integrity (tamper detection) |
| `redis` | Upstash Redis connectivity for distributed rate limiting |
| `email` | SendGrid/SMTP provider configured |
| `migrations` | Latest applied migration name |
| `company` | Active/total employee counts |

**Overall status**: `healthy` (all ok) / `degraded` (warnings) / `unhealthy` (errors)

---

## 5. Best Practices

1. **Export weekly**: Admin should download a JSON backup every week via `POST /api/admin/backup`.
2. **Upgrade to Supabase Pro**: Gets automatic daily backups with 7-day retention.
3. **Enable PITR** (Enterprise): Point-in-time recovery with WAL archiving for zero data loss.
4. **Never use `prisma db push` in production**: Always use `prisma migrate deploy`.
5. **Test restores quarterly**: A backup you've never tested is not a backup.
6. **Monitor audit chain**: If `GET /api/admin/health` shows audit_chain errors, investigate immediately — it may indicate data tampering.
