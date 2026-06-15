# Company Go-Live 60-Minute Script

Prerequisites: staging URL, seeded test company, valid admin and employee mailboxes, Meta test app only after G6.

| Minute | Actor | URL or API | Verify |
|--------|-------|------------|--------|
| 0 | Admin | `/sign-up` company mode | account created |
| 2 | Admin | `/onboarding` steps 1-13 | each save returns 200 |
| 25 | Admin | `POST /api/onboarding/finalize` | `Company.onboarding_completed=true` |
| 27 | Admin | `/admin/people/invite` x3 with phone | invites created |
| 35 | Employee | `/invite/accept/[token]` | employee active |
| 40 | Employee | `/employee/profile` phone save | E.164 stored in DB |
| 45 | Admin | `/admin/integrations/whatsapp` | reachable only when `NEXT_PUBLIC_WHATSAPP_ENABLED=true` |
| 50 | Employee | WhatsApp HELP | only after G6 and Chunk 05 |
| 55 | Employee | leave flow Confirm | `LeaveRequest` row created |
| 60 | QA | audit log | channel metadata present |

Rollback: disable `NEXT_PUBLIC_WHATSAPP_ENABLED`, set tenant `messaging_enabled=false`, redeploy, and use web HR routes.
