# C13 — Billing & Payments

**Priority:** P2 | **Routes:** billing upgrade, `/api/payments/*`, webhooks

**User:** Admin upgrades plan via Razorpay/Cashfree.  
**Connects:** Super admin subscription cap (C09), company billing view.  
**Defects:** Webhook idempotency; env keys on Vercel.  
**Recovery:** Payment verify retry; manual super-admin subscription patch.  
**Tests:** payment route static tests if present
