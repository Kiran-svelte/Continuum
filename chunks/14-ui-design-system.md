# C14 — UI Design System & Portal Shell

**Priority:** P2 | **Scope:** `globals.css` tokens, theme, portal layout, marketing

**User:** Consistent light/dark UX across portals and landing.  
**Connects:** All pages; AGENTS.md token-first contract.  
**Defects:** Residual hardcoded hex (PR13); theme toggle on all shells.  
**Recovery:** Theme init script + CSS variables — no runtime crash on bad token.  
**Tests:** `w2-integ-001-validation.test.ts`, `ui21-wave1-wave2-foundation.test.ts`

**Status:** PR11/12 merged to production for landing/shell; portal pages ongoing.
