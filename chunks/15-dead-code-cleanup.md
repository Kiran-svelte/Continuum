# C15 — Dead Code & Cleanup

**Priority:** P3

---

## Remove candidates

| Path | Reason |
|------|--------|
| `lib/firebase`, `lib/firebase-admin` imports (missing files) | Unused; scan found on UX branch |
| `app/api/onboarding/step/[step]/route-enhanced.ts` | Duplicate if alias unused |
| `app/actions/auth.ts` session cookie path | After C01 JWT migration verified |
| `tests/auth-flow.test.ts.old` | Rename or delete |
| Duplicate onboarding paths (`company/`, `invite-team/`) | Consolidate under single wizard |
| Hardcoded hex in tutorial modals | PR13 tokenization |
| `web/web/` nested legacy | Non-authoritative per AGENTS.md |

---

## Process

1. Grep for imports before delete  
2. Run full test suite  
3. One cleanup PR per subsystem  
