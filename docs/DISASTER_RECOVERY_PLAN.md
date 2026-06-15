# Disaster Recovery Plan — Continuum

**Production:** https://continuum.support  
**Application:** Vercel (`web/` Next.js)  
**Database:** Neon PostgreSQL  
**Files:** Appwrite storage (documents)

## Objectives

| Metric | Target |
|--------|--------|
| **RTO** (recovery time) | 4 hours for full app restore |
| **RPO** (data loss) | ≤ 1 hour (Neon PITR) |

## 1. Failure scenarios

| Scenario | Detection | Response |
|----------|-----------|----------|
| Vercel deploy bad | CI failure / health 503 / uptime alert | Roll back deployment in Vercel → previous promotion |
| Database unavailable | `/api/health` database unhealthy | Check Neon status; fail over connection string if provided |
| Data corruption / bad migration | App errors, support reports | Restore Neon branch from PITR; redeploy known-good app version |
| Appwrite outage | Document upload failures | Queue retries; communicate on `/status` |
| Domain / DNS failure | Uptime monitor down globally | Fix DNS at registrar / Cloudflare |
| Credential leak | Security alert | Rotate JWT secrets (forces re-login), API keys, Better Stack tokens |

## 2. Backup sources

| Asset | Backup method | Owner |
|-------|---------------|--------|
| PostgreSQL | Neon PITR + optional scheduled exports | Platform admin |
| Application code | GitHub `main` | Engineering |
| Env secrets | Vercel env export (encrypted store) | Platform admin |
| Appwrite files | Appwrite backup / export | Platform admin |

**Action required:** Confirm Neon PITR is enabled for the production project.

## 3. Restore procedure (database)

1. Open Neon console → project → **Restore** / branch from timestamp.
2. Create recovery branch at last known good time (before incident).
3. Update `DATABASE_URL` and `DIRECT_URL` in Vercel **only** after validating branch.
4. Run `npx prisma migrate deploy` if schema drift suspected.
5. Smoke test: sign-in, leave list, health endpoint.
6. Switch production traffic (update env vars → redeploy).

## 4. Restore procedure (application)

1. Vercel → Deployments → select last green production deployment → **Promote to Production**.
2. Verify `https://continuum.support/api/health` returns `healthy`.
3. Run smoke: sign-in, HR dashboard, one API write.

## 4.1 Channel table recovery

Zero UI channel state is stored in PostgreSQL and must be recovered with the rest of the tenant database. During a restore, explicitly verify `ChannelIdentityLink`, `ChannelVerificationChallenge`, `WhatsAppTenantConfig`, `IdempotencyRecord`, `AssistantConversation`, `AssistantMessageRecord`, and `ChannelBlocklist` before re-enabling channel traffic.

1. Restore Neon to the target point-in-time branch.
2. Run `npx prisma migrate deploy` against the recovery branch.
3. Check active `ChannelIdentityLink` rows for revoked phone links before reopening WhatsApp.
4. Keep WhatsApp disabled until webhook signature, template, inbound, and outbound smoke evidence is refreshed.

## 5. Communication

1. Update public **/status** (incidents section auto-shows unhealthy checks).
2. Optional: Better Stack / UptimeRobot status page subscription.
3. Email in-app notice via admin broadcast (if available).

## 6. Post-incident

- Root cause document in internal wiki
- Add regression test or monitor if applicable
- Update this runbook if steps were wrong

## 7. Contacts (fill in)

| Role | Name | Contact |
|------|------|---------|
| Platform owner | _TBD_ | |
| On-call engineer | _TBD_ | |
| Neon support | Neon dashboard | |
| Vercel support | Vercel dashboard | |

## 8. Drill schedule

- **Quarterly:** Restore Neon branch to staging; verify app connects.
- **After major schema migration:** Backup snapshot before migrate.
