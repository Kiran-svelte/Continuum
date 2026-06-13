# C16 — UI Theme & Contrast Spec (Light / Dark)

**Priority:** P0 | **Scope:** `web/app/globals.css`, auth surfaces, portal shells  
**Contract:** AGENTS.md token-first styling; WCAG AA minimum on all body copy  
**Status:** Implemented in working tree (awaiting PR split)

---

## Design read

B2B HRMS auth and portal UI for enterprise buyers, trust-first accessibility language, Geist + CSS variable tokens (no hardcoded hex in auth paths).

**Dials:** variance 4 · motion 3 · density 4

---

## Typography

| Role | Token / class | Light | Dark | Min contrast target |
|------|---------------|-------|------|---------------------|
| Font stack (sans) | `--font-sans` | Geist Sans + system UI | same | — |
| Font stack (mono) | `--font-mono` | Geist Mono | same | — |
| Display / H1 | `.text-display`, `.text-h1` | `--text-primary` `#0f172a` | `#f8fafc` | 7:1 preferred |
| Section title | `.text-h2`, `.text-h3` | `--text-primary` | `--text-primary` | 4.5:1 |
| Body | `.text-body` | `--text-secondary` `#334155` | `#cbd5e1` | 4.5:1 on `--card` |
| Caption / helper | `.text-caption`, `.helper-text` | `--text-secondary` | `--text-secondary` | 4.5:1 on `--card` |
| Muted meta | `--muted-foreground` | `#64748b` | `#b4c3dc` | 4.5:1 on `--background` |
| Kicker / label | `.text-kicker` | `--muted-foreground` | `--muted-foreground` | 3:1 large text OK |

**Rule:** On `--card` / `--bg-surface`, never use light-mode-only hex. Use `--text-secondary` for descriptions, not opacity hacks.

---

## Surfaces & borders

| Token | Light | Dark | Usage |
|-------|-------|------|--------|
| `--background` / `--bg-base` | `#f6f7fb` | `#090b10` | Page canvas |
| `--card` / `--bg-surface` | `#ffffff` | `#11151d` | Cards, auth panels |
| `--muted` / `--bg-surface-hover` | `#eef2f7` | `#1a202a` | Hover, inset wells |
| `--border` | `#dbe3ee` | `#243041` | Default borders |
| `--border-strong` | `#c6d0de` | `#344255` | Emphasis panels |
| `--surface-elevated` | `--bg-surface` | `--bg-surface` | Modals, popovers |

---

## Brand & actions

| Token | Light | Dark | Usage |
|-------|-------|------|--------|
| `--primary` | `#2563eb` | `#7aa2ff` | Primary CTAs, links |
| `--primary-foreground` | `#ffffff` | `#ffffff` | Text on primary buttons |
| `--accent-primary-hover` | `#1d4ed8` | `#5f8cff` | Hover state |
| `--accent-soft` | `#eaf2ff` | `rgba(122,162,255,0.12)` | Tinted highlights |
| `--ring` / focus | `--primary` | `--primary` | Focus rings via `--focus-ring` |

---

## Status & semantic

| Token | Light | Dark | Pair with |
|-------|-------|------|-----------|
| `--status-success` | `#059669` | `#34d399` | `--success-bg` |
| `--status-warning` | `#d97706` | `#fbbf24` | `--warning-bg` |
| `--status-danger` | `#dc2626` | `#f87171` | `--danger-bg` |
| `--destructive` | same as danger | same | Error banners |
| `--success-bg` | `#ecfdf5` | `rgba(52,211,153,0.1)` | Checklist rows |
| `--status-success-soft` | `#d1fae5` | `rgba(52,211,153,0.15)` | Badges |

**Rule:** Success list text uses `--foreground` on checklist rows; icon/check only uses `--status-success`. Never `text-green-800` or dark green on dark cards.

---

## Auth-specific utilities (globals.css)

| Class | Purpose |
|-------|---------|
| `.auth-panel` | Standard info card on auth pages |
| `.auth-panel-emphasis` | Highlighted trust panel (Secure by Design) |
| `.auth-step-list` | Numbered steps; titles `--foreground`, body `.text-caption` |
| `.auth-checklist` | Role list; `--foreground` text + success icon |
| `.text-caption` | Secondary body on elevated surfaces |

---

## Shape & motion

| Token | Value |
|-------|-------|
| `--radius-sm` | 0.625rem |
| `--radius` | 0.875rem |
| `--radius-lg` | 1.125rem |
| `--radius-xl` | 1.5rem |
| `--motion-fast` | 150ms |
| `--motion-normal` | 220ms |
| Button active | `scale(0.98)` |

---

## Theme initialization

- Root: `web/app/layout.tsx` + `ThemeProvider` (class `.dark` on `<html>`)
- `color-scheme: dark light` on `html`
- Test both modes before ship; hard refresh after deploy

---

## Sign-up modes

| Mode | Trigger | UI |
|------|---------|-----|
| Invitation gate (default prod) | No `NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP` | Invitation Required panel |
| Public credential signup | `NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP=true` | Credential-first form (dev/demo) |
| Invite link | `?invite=` or `?token=` query | Redirect to `/invite/accept?token=` |

---

## Known debt (follow-up PRs)

- `modern-stunning-sign-in.module.css` — light-only hex, unused; delete or tokenize
- Residual Tailwind `text-slate-*` in portal pages (C14 ongoing)
- Badge rgba hardcodes migrated to `--status-*-soft` in this pass

---

## Verification checklist

- [ ] `/sign-up` dark mode: step descriptions readable
- [ ] `/sign-up` dark mode: role checklist readable
- [ ] `/sign-in` form labels, placeholders, errors pass contrast
- [ ] Primary + ghost buttons readable in both modes
- [ ] Theme toggle persists across refresh
