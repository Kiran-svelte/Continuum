# Operations Readiness — 20 Categories

Continuum production target: **https://continuum.support**

This matrix maps your 20 operational categories to what is **implemented in code**, what is **configured on Vercel/Neon/Better Stack**, and what remains **your action** in external dashboards.

## Live scorecard (super-admin)

- **UI:** `/super-admin/operations`
- **API:** `GET /api/ops/operations-readiness` (super-admin only)
- **Public status:** `/status` + `/api/health`

---

## Critical (1–10)

| # | Category | In product / code | External config | Status on continuum.support |
|---|----------|-------------------|-----------------|------------------------------|
| 1 | Monitoring | `/api/health`, `/api/health/ready`, `/api/health/live` | Better Stack uptime monitor + optional UptimeRobot | ✅ Monitor + health |
| 2 | Database backups | Prisma + Neon | **Neon console:** enable PITR / backups | ⚠️ Enable & test restore in Neon |
| 3 | Error tracking | Sentry SDK, `global-error.tsx`, `error-tracking.ts` | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` on Vercel | ⚠️ Set DSN if not set |
| 4 | Logging | Winston + Better Stack transport | `BETTERSTACK_SOURCE_TOKEN` | ✅ Telemetry token on Vercel |
| 5 | Alerting | Security events → logs | Better Stack alerts: 5xx, `auth.login_failed_threshold`, uptime down | ⚠️ Create alert rules in dashboard |
| 6 | Security | Middleware, HIBP, failed-login, module gates, audit | Cloudflare WAF (see PRODUCTION_SECURITY.md) | ✅ App layer |
| 7 | SSL | HSTS, CSP headers | Vercel + Cloudflare SSL | ✅ HTTPS custom domain |
| 8 | Authentication | JWT, refresh, RBAC, cookies | `JWT_SECRET`, `SESSION_SECRET`, etc. | ✅ |
| 9 | Rate limiting | Middleware + `api-rate-limit` + Redis | `UPSTASH_*` for distributed limits | ✅ |
| 10 | Environment management | `validateEnv()`, Vercel env scopes | Separate Preview vs Production vars | ✅ Vercel |

---

## Highly recommended (11–15)

| # | Category | In product / code | External config |
|---|----------|-------------------|-----------------|
| 11 | CI/CD | `.github/workflows/web-ci.yml` | Branch protection on `main` |
| 12 | Disaster recovery | `docs/DISASTER_RECOVERY_PLAN.md` | Run annual drill |
| 13 | Performance monitoring | Sentry traces (10% prod) | Sentry Performance dashboard |
| 14 | Cost monitoring | — | Vercel / Neon / Better Stack billing alerts |
| 15 | Compliance | Audit logs, privacy page, SECURITY_AND_COMPLIANCE.md | GDPR export/delete process |

---

## Scaling / trust (16–20)

| # | Category | Who provides it |
|---|----------|-----------------|
| 16 | Load balancing | Vercel Edge (automatic) |
| 17 | Auto-scaling | Vercel serverless (automatic) |
| 18 | DB replication / HA | Neon plan + pooled `DATABASE_URL` |
| 19 | CDN | Vercel Edge CDN |
| 20 | Status page | `/status` (live health) + optional Better Stack public status |

---

## “Perfect” definition

**Perfect for Continuum means:**

1. All **critical** categories are `complete` or `platform` on the super-admin scorecard.
2. No category is `missing` before a major marketing / enterprise launch.
3. **Partial** items have owners and dates (e.g. Sentry DSN, Neon restore drill, Better Stack alerts).

Code cannot alone make #2 (backups), #5 (alert rules), or #14 (cost alerts) perfect — those require dashboard configuration.

---

## Quick verification commands

```bash
# Health
curl -s https://continuum.support/api/health | jq .status

# Readiness (needs auth cookie — use super-admin UI instead)
# Super-admin scorecard
open https://continuum.support/super-admin/operations
```

---

## Related docs

- [BETTERSTACK_SETUP.md](./BETTERSTACK_SETUP.md)
- [SENTRY_SETUP.md](./SENTRY_SETUP.md)
- [PRODUCTION_SECURITY.md](./PRODUCTION_SECURITY.md)
- [DISASTER_RECOVERY_PLAN.md](./DISASTER_RECOVERY_PLAN.md)
- [ENVIRONMENT_MANAGEMENT.md](./ENVIRONMENT_MANAGEMENT.md)
- [UPTIMEROBOT_SETUP.md](./UPTIMEROBOT_SETUP.md)
