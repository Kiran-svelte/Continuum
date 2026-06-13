# Sentry error tracking

Continuum uses [@sentry/nextjs](https://docs.sentry.io/platforms/javascript/guides/nextjs/) for production error monitoring on `https://continuum.support`.

## 1. Create a Sentry project

1. Sign in at [sentry.io](https://sentry.io).
2. Create an organization (if needed) and a **Next.js** project (e.g. `continuum-web`).
3. Copy the **DSN** from **Settings → Client Keys (DSN)**.

## 2. Environment variables

Set these in **Vercel** (Production + Preview) and local `.env` (never commit real values):

| Variable | Required | Purpose |
|----------|----------|---------|
| `SENTRY_DSN` | Yes (prod) | Server/API error reporting |
| `NEXT_PUBLIC_SENTRY_DSN` | Yes (prod) | Client/React errors (same DSN as above) |
| `SENTRY_ORG` | For source maps | Organization slug |
| `SENTRY_PROJECT` | For source maps | Project slug |
| `SENTRY_AUTH_TOKEN` | For source maps | CI upload token (`project:releases`) |
| `SENTRY_ENVIRONMENT` | No | Override tag (defaults to `VERCEL_ENV` / `NODE_ENV`) |

Example (Vercel CLI):

```bash
vercel env add SENTRY_DSN production
vercel env add NEXT_PUBLIC_SENTRY_DSN production
```

Redeploy after adding env vars.

## 3. Code integration (already in repo)

| File | Role |
|------|------|
| `web/instrumentation.ts` | Registers server/edge SDK + `onRequestError` |
| `web/instrumentation-client.ts` | Client SDK + router transitions |
| `web/sentry.server.config.ts` / `sentry.edge.config.ts` | Runtime init |
| `web/lib/sentry-config.ts` | Shared DSN, sampling, PII scrubbing |
| `web/lib/error-tracking.ts` | `captureError()` for API routes |
| `web/app/global-error.tsx` | App Router fatal errors |
| `web/next.config.ts` | `withSentryConfig`, tunnel `/sentry-tunnel` |

API routes should use `captureError` from `@/lib/error-tracking` in catch blocks.

## 4. Verify

1. Deploy with DSN set.
2. In the browser (not DevTools console), trigger a test error on a page, or call an API that throws in a controlled test.
3. Open **Issues** in the Sentry project within a few minutes.

Ad-blockers: events are tunneled via `/sentry-tunnel` (excluded from auth middleware).

## 5. Sentry MCP (Cursor)

The hosted MCP server connects Cursor to your Sentry account for debugging (issues, stack traces, Seer).

**Cursor `mcp.json`:**

```json
{
  "mcpServers": {
    "Sentry": {
      "url": "https://mcp.sentry.dev/mcp"
    }
  }
}
```

On first use, Cursor runs **OAuth** against Sentry (no token in the config file). Optional path scope: `https://mcp.sentry.dev/mcp/{org}/{project}`.

Docs: [Sentry MCP](https://docs.sentry.io/ai/mcp/)

## 6. Security

- Do not commit DSN-adjacent secrets beyond the public DSN (DSN is not a secret but treat org tokens as secrets).
- `SENTRY_AUTH_TOKEN` is for CI/source maps only.
- `sendDefaultPii` is **false**; breadcrumbs scrub password/token fields.
