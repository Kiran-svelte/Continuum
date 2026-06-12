# Continuum Marketing Brochure

## Files

| File | Purpose |
|------|---------|
| `continuum-brochure-12x16.html` | Interactive 12×16 brochure (generated) |
| `brochure-inventory.json` | Codebase scan: routes, views, components |

## Regenerate from codebase

```bash
node scripts/marketing/export-brochure-inventory.mjs
node scripts/marketing/build-brochure-html.mjs
```

## Preview locally

```bash
npx serve docs/marketing -l 3456
# Open http://localhost:3456/continuum-brochure-12x16.html
```

## Features

- **21 spreads** at 12×16 inches (print via browser → Save as PDF)
- **Light / dark theme** toggle (persisted in localStorage)
- **Live portal mock** (Admin, HR, Manager, Employee) with KPI animation
- **Click any route pill** to switch portal preview
- **Jump nav** to any spread
- **Full inventory**: 145 routes, 127 views, design-system, UI, motion, assistant, APIs

## Print settings

Chrome/Edge → Print → Paper **12 × 16 in** → Background graphics **on** → Margins **none**
