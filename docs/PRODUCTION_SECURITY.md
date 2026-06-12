# Production security layer

Defense in depth for `https://continuum.support`. Cloudflare handles network edge; the app enforces auth, validation, headers, and monitoring.

## Control matrix

| # | Control | Implementation | Priority |
|---|---------|----------------|----------|
| 1 | HTTPS + SSL | Cloudflare + Vercel TLS; HSTS in `next.config.ts` / middleware | P0 |
| 2 | Rate limiting | Cloudflare + middleware (`RATE_LIMITS`) + `checkApiRateLimitAsync` on auth APIs | P0 |
| 3 | Failed login alerts | `recordFailedLoginAttempt` → structured logs → Better Stack alerts | P0 |
| 4 | Audit logs | Prisma `createAuditLog` on sign-in / sensitive actions | P0 |
| 5 | SQL injection | Cloudflare WAF + Prisma parameterized queries + URL threat scan | P0 |
| 6 | XSS | Cloudflare WAF + `sanitizeInput` / `xss` package / CSP headers | P0 |
| 7 | DDoS | Cloudflare (enable in dashboard) | P1 |
| 8 | Bot blocking | Cloudflare Bot Fight / Super Bot Fight Mode | P1 |
| 9 | Breached passwords | HIBP k-anonymity API on signup / reset / invite accept | P1 |
| 10 | Security headers | `getProductionSecurityHeaders()` in middleware + `next.config.ts` | P1 |
| 11 | Suspicious IP blocking | `SECURITY_BLOCKED_IPS` + Redis/in-memory auto-block after repeated failed logins | P2 |

## Cloudflare checklist (manual — dashboard)

1. Add `continuum.support` to Cloudflare; proxy orange-cloud enabled.
2. **SSL/TLS** → Full (strict); enable **Always Use HTTPS**.
3. **Security** → WAF managed rules (OWASP, SQLi, XSS).
4. **Security** → **Bot Fight Mode** (or Super Bot Fight on paid plan).
5. **Security** → Rate limiting rule: `/api/auth/*` (e.g. 10 req/min per IP).
6. **DNS** → Apex `A` to Vercel; `www` CNAME per Vercel instructions.
7. Optional: IP allowlist for `/admin` if you use fixed office IPs.

## Application env vars

```env
# Block known abusive IPs (comma-separated)
SECURITY_BLOCKED_IPS=

# Failed login thresholds (defaults shown)
AUTH_FAILED_LOGIN_WINDOW_SEC=900
AUTH_FAILED_LOGIN_ALERT_THRESHOLD=5
AUTH_FAILED_LOGIN_AUTO_BLOCK_THRESHOLD=15

# HIBP breach check (set false to disable)
HIBP_PASSWORD_CHECK_ENABLED=true
```

## Code map

| Module | Role |
|--------|------|
| `web/middleware.ts` | IP block (incl. Redis), threat scan, rate limits, security headers |
| `web/lib/production-security/` | IP, HIBP, failed login, threat detection |
| `web/lib/password-policy.ts` | Strength + breach check for new passwords |
| `web/lib/security.ts` | Sanitization, CSRF helpers, base headers |
| `web/lib/integrity/sanitizers.ts` | XSS + SQL sanitization for inputs |
| `web/lib/api-rate-limit.ts` | Redis-backed API rate limits |

## Verify

1. Deploy with Better Stack token → confirm logs in Better Stack Live tail.
2. Trigger 6 failed sign-ins from one IP → see `auth.login_failed_threshold` in logs.
3. Try signup with password `Password123!` only if not breached — use a known breached password test in staging.
4. Confirm response headers include `Strict-Transport-Security`, `Content-Security-Policy`, `X-Frame-Options`.
