# Zero UI Pre-Flight Release Checklist

- [ ] G1-G6 proofs linked in `web/docs/proofs/ZERO_UI_PREFLIGHT_SIGNOFF.md`
- [ ] Zero UI pre-flight CI green on the release branch
- [ ] `WHATSAPP_BYPASS_SIGNATURE` is false for production
- [ ] Staging demo tenant 60-minute go-live completed
- [ ] Runbooks reviewed by the on-call owner
- [ ] Privacy addendum published before any WhatsApp pilot
- [ ] Chunk 05 WhatsApp branch is not merged before GO
- [ ] `forwardAuthenticatedApi` absent from assistant request/approval actions
- [ ] `/onboarding/company` does not render the active wizard
