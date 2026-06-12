# Better Stack — logging, telemetry, and uptime

Continuum ships structured logs to **Better Stack** (formerly Logtail) when a source token is configured. Uptime monitoring uses the Better Stack Uptime API (separate token).

**Never commit API tokens to git.** Set them in Vercel / local `.env` only.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `BETTERSTACK_SOURCE_TOKEN` | Logs / telemetry ingest (your **Telemetry** source token) |
| `BETTERSTACK_LOGS_HOST` | Optional ingest host from source settings (default `in.logs.betterstack.com`) |
| `BETTERSTACK_UPTIME_API_TOKEN` | Uptime API (your **Uptime** token) — monitors & alerts |
| `LOGTAIL_SOURCE_TOKEN` | Alias for `BETTERSTACK_SOURCE_TOKEN` |

Legacy aliases `BETTERSTACK_TELEMETRY_TOKEN` and `LOGTAIL_INGEST_HOST` are also supported.

### Vercel (production)

```bash
vercel env add BETTERSTACK_SOURCE_TOKEN production
vercel env add BETTERSTACK_UPTIME_API_TOKEN production
# Optional, if your source uses a regional host:
vercel env add BETTERSTACK_LOGS_HOST production
```

Redeploy after setting env vars.

## What gets logged

- All `logger.*` calls from `web/lib/logger.ts` (JSON + PII redaction) → Logtail transport when `BETTERSTACK_SOURCE_TOKEN` is set
- Enterprise logger (`web/lib/enterprise/logger.ts`) when used
- **Security events** (`web/lib/security-events.ts`) with `security: true` for alert rules (API routes / Node runtime)
- **Middleware** blocks (rate limit, threat scan) emit structured JSON to **stdout** — visible in Vercel Logs; add a [Vercel log drain](https://betterstack.com/docs/logs/vercel/) to Better Stack or rely on API-layer `logSecurityEvent` for alerts

Confirm ingest host in Better Stack → Sources → your source → **ingesting host** (set `BETTERSTACK_LOGS_HOST` if not the default `in.logs.betterstack.com`).

### Recommended Better Stack alerts

Create log-based alerts in Better Stack for:

| Query / filter | Alert |
|----------------|-------|
| `security:true` AND `event:auth.login_failed_threshold` | Failed login burst (P0) |
| `level:error` AND `security:true` | Critical security event |
| `level:error` | Application errors |
| absence of logs 15m | Service down (or use Uptime monitor) |

## Uptime monitor

Create an HTTP monitor for `https://continuum.support` (and optionally `/api/health/live`) in the Better Stack Uptime dashboard, or via API:

```bash
curl -s -X POST "https://uptime.betterstack.com/api/v2/monitors" \
  -H "Authorization: Bearer $BETTERSTACK_UPTIME_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://continuum.support","monitor_type":"status","check_frequency":300}'
```

Adjust URL/body to match the [Better Stack Uptime API](https://betterstack.com/docs/uptime/api/) for your account.

## Code references

- Transport: `web/lib/betterstack/logging.ts`
- Security events: `web/lib/security-events.ts`
- Failed login alerts: `web/lib/production-security/failed-login-alerts.ts`
