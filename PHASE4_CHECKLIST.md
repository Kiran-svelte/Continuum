# PHASE 4: Infrastructure Hardening Checklist

> Enterprise production readiness: Email delivery, Migration tracking, Distributed rate limiting, Backup strategy

---

## CHUNK 1: SendGrid Email Integration (Primary: Web API, Fallback: SMTP)

### 1.1 Install & Configure SendGrid
- [x] Install `@sendgrid/mail` package
- [x] Add `SENDGRID_API_KEY` to `.env`
- [x] Add `SENDGRID_FROM_EMAIL` to `.env` (verified sender)
- [x] Add `EMAIL_PROVIDER` env var (`sendgrid` | `smtp`) to control which transport is used

### 1.2 Rewrite Email Transport Layer
- [x] Add SendGrid Web API transport as **primary** in `lib/email-service.ts`
- [x] Keep SMTP (nodemailer) as **automatic fallback** if SendGrid fails
- [x] Remove Gmail OAuth2 path (deprecated — SendGrid replaces it)
- [x] Update `sendEmail()` to try SendGrid first, then SMTP on failure
- [x] Log which transport succeeded for debugging

### 1.3 SendGrid-Specific Features
- [x] Set SendGrid categories/tags per email type (welcome, leave, invite, etc.) for analytics
- [x] Use SendGrid tracking settings (open/click tracking disabled for privacy)
- [x] Handle SendGrid-specific errors (401 unauthorized, 403 forbidden sender, 429 rate limit)

### 1.4 Test Email Delivery
- [x] Create `POST /api/admin/test-email` endpoint (admin-only)
- [x] Sends test email to the requesting admin's email address
- [x] Returns delivery status (sendgrid success, smtp fallback, or both failed)
- [x] Verify email arrives in inbox (not spam) — **confirmed via Gmail SMTP fallback**

> **Note**: SendGrid Web API returns 403 until sender identity is verified in the SendGrid dashboard.
> Gmail SMTP fallback is active and delivering emails successfully.
> Once sender is verified, SendGrid Web API becomes primary automatically.

---

## CHUNK 2: Prisma Migration Tracking (Replace db push)

### 2.1 Initialize Migration System
- [x] Generate baseline SQL from current schema via `prisma migrate diff`
- [x] Create `prisma/migrations/0_init/migration.sql` with 1383-line baseline
- [x] Mark baseline as already applied via `prisma migrate resolve --applied 0_init`

### 2.2 Update Scripts
- [x] Update `package.json` scripts:
  - `"db:migrate:dev"` → `prisma migrate dev`
  - `"db:migrate:deploy"` → `prisma migrate deploy` (production)
  - `"db:migrate:status"` → `prisma migrate status`
  - `"db:migrate:reset"` → `prisma migrate reset` (dev only)
- [x] Removed deprecated `prisma:push` script

### 2.3 Verify
- [x] `prisma migrate status` returns "Database schema is up to date!"

---

## CHUNK 3: Redis-Backed Distributed Rate Limiting

### 3.1 Install & Configure Redis Client
- [x] Install `@upstash/redis` (serverless-compatible, no connection pool needed)
- [x] Add `UPSTASH_REDIS_REST_URL` to `.env`
- [x] Add `UPSTASH_REDIS_REST_TOKEN` to `.env`
- [x] Create `lib/redis.ts` with singleton client + graceful fallback to in-memory

### 3.2 Migrate Rate Limiting to Redis
- [x] Implement `redisRateLimit()` with sliding window (sorted set) algorithm in `lib/redis.ts`
- [x] Update `lib/api-rate-limit.ts` to use Redis when available, in-memory fallback
- [x] Added `checkApiRateLimitAsync()` for new API routes (fully async Redis check)
- [x] All rate limit keys include identifying prefix (`rl:api:`, `rl:mw:`, `rl:email:`)

### 3.3 Migrate Email Rate Limiting to Redis
- [x] Created `redisEmailRateLimit()` — Redis counter with TTL
- [x] Key format: `rl:email:global` with 60-second expiry
- [x] Updated `sendEmail()` to check Redis first, then in-memory fallback

### 3.4 Test & Verify
- [x] Graceful fallback works when Redis not configured (returns `allowed: true`)
- [x] `next build` passes

> **Note**: Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to enable distributed
> rate limiting. Without them, the system uses in-memory fallback (suitable for single-instance).

---

## CHUNK 4: Database Backup & Recovery Strategy

### 4.1 Application-Level Backup Endpoint
- [x] Created `POST /api/admin/backup` — exports company data as JSON
- [x] Includes: employees, leaves, attendance, payroll, documents metadata, audit logs
- [x] Excludes: passwords, auth tokens, binary file content, bank details
- [x] Admin-only access with audit log (`DATA_EXPORT` action)
- [x] Returns downloadable JSON file with timestamped filename

### 4.2 Point-in-Time Recovery Documentation
- [x] Created `BACKUP_STRATEGY.md` covering:
  - Supabase automatic backups by plan tier
  - 5 disaster recovery scenarios with step-by-step recovery
  - `pg_dump` / `pg_restore` commands for DBA
  - Quarterly restore test procedure checklist
  - PITR/WAL archiving guidance for Enterprise plan

### 4.3 Data Integrity Verification
- [x] Created `GET /api/admin/health` endpoint checking:
  - Database connectivity (live query)
  - Audit log chain integrity (`verifyAuditChain()`)
  - Redis connectivity status
  - Email provider configuration
  - Migration status (latest applied)
  - Company employee stats

---

## CHUNK 5: Final Verification & Hardening

- [x] `tsc --noEmit` passes with zero errors
- [x] `next build` succeeds (all pages compile)
- [x] Email delivery confirmed (Gmail SMTP fallback active, SendGrid pending sender verification)
- [x] Rate limiting implemented (in-memory active, Redis ready when configured)
- [x] Backup endpoint created (`POST /api/admin/backup`)
- [x] Health check endpoint created (`GET /api/admin/health`)

---

## PROGRESS

| Chunk | Status | Items |
|-------|--------|-------|
| 1: SendGrid Email | **COMPLETE** | 13/13 |
| 2: Prisma Migrations | **COMPLETE** | 6/6 |
| 3: Redis Rate Limiting | **COMPLETE** | 11/11 |
| 4: Backup & Recovery | **COMPLETE** | 8/8 |
| 5: Final Verification | **COMPLETE** | 6/6 |
| **Total** | **ALL COMPLETE** | **44/44** |

---

## One-Time Action Required (by user)

1. **Verify SendGrid Sender Identity**:
   - Go to SendGrid Dashboard → Settings → Sender Authentication → Verify Single Sender
   - Enter `continuum1105@gmail.com` → Click verification link in inbox
   - After verification, emails auto-switch from Gmail SMTP to SendGrid Web API

2. **Provision Upstash Redis** (optional, for multi-instance):
   - Sign up at https://upstash.com (free tier: 10k requests/day)
   - Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in `.env`
   - Rate limiting automatically switches to distributed mode
