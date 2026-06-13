/**
 * Builds continuum-brochure-12x16.html from brochure-inventory.json
 * Run: node scripts/marketing/build-brochure-html.mjs
 */
import fs from 'fs';
import path from 'path';

const inv = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'docs/marketing/brochure-inventory.json'), 'utf8')
);

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function renderRouteGrid(routes) {
  return routes
    .map(
      (r) =>
        `<span class="route-pill" data-route="${r.replace(/"/g, '&quot;')}">${r}</span>`
    )
    .join('');
}

function renderCategoryBlock(title, items) {
  if (!items || !items.length) return '';
  return `<div class="sec-h">${title} (${items.length})</div><div class="comp-grid">${renderList(items)}</div>`;
}

function renderList(items, cls = 'comp-pill') {
  return items.map((i) => `<span class="${cls}">${i}</span>`).join('');
}

const portalNav = {
  admin: ['Getting Started', 'Dashboard', 'Setup Wizard', 'People', 'RBAC', 'Billing'],
  hr: ['Dashboard', 'Leave Requests', 'Attendance', 'Payroll', 'Employees', 'Reports'],
  manager: ['Dashboard', 'Approvals', 'Team', 'Directory', 'Performance'],
  employee: ['Dashboard', 'Request Leave', 'Attendance', 'Payslips', 'Documents'],
};

const html = `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Continuum HRMS — Complete Interactive Brochure (12×16)</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>
<style>
:root{
  --font:'Outfit',system-ui,sans-serif;--mono:'JetBrains Mono',monospace;
  --accent:#2563eb;--accent-soft:rgba(37,99,235,.12);--accent-hover:#1d4ed8;
  --success:#059669;--warn:#d97706;--danger:#dc2626;
  --radius:12px;--radius-lg:16px;--gutter:.48in;
  --bg:#f4f6fb;--surface:#fff;--surface-2:#eef2f9;--border:#d8e0ec;
  --text:#0f172a;--text-2:#334155;--muted:#64748b;
  --sidebar:#0f172a;--sidebar-text:#e2e8f0;--shadow:0 8px 32px rgba(15,23,42,.08);
  --canvas:#18181b;
}
[data-theme="dark"]{
  --bg:#09090b;--surface:#18181b;--surface-2:#27272a;--border:#3f3f46;
  --text:#fafafa;--text-2:#d4d4d8;--muted:#71717a;
  --accent-soft:rgba(37,99,235,.18);--shadow:0 8px 40px rgba(0,0,0,.45);--canvas:#09090b;
}
@media(prefers-color-scheme:light){html:not([data-theme="dark"]):not([data-theme="light"]){}}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--font);background:var(--canvas);color:var(--text);-webkit-font-smoothing:antialiased;line-height:1.5}
@media print{body{background:#fff}.chrome{display:none!important}.spread{box-shadow:none!important;margin:0!important;break-after:page}}
@page{size:12in 16in;margin:0}

/* Chrome */
.chrome{position:fixed;top:0;left:0;right:0;z-index:200;display:flex;align-items:center;gap:10px;padding:10px 16px;background:rgba(9,9,11,.88);backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,.08);font-size:12px;color:#d4d4d8}
.chrome button,.chrome select{padding:6px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#fafafa;font:inherit;cursor:pointer;font-size:11px}
.chrome button:hover{background:rgba(37,99,235,.25);border-color:rgba(37,99,235,.4)}
.chrome .logo{font-weight:700;color:#fafafa;margin-right:auto;letter-spacing:-.02em}
.chrome .stat{font-family:var(--mono);font-size:10px;color:#71717a}

/* Spreads */
.spread{width:12in;height:16in;background:var(--bg);margin:72px auto 16px;padding:var(--gutter);display:flex;flex-direction:column;position:relative;overflow:hidden;box-shadow:var(--shadow);page-break-after:always}
.spread::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 85% 0%,var(--accent-soft),transparent 55%);pointer-events:none}
.spread-inner{position:relative;z-index:1;display:flex;flex-direction:column;flex:1;min-height:0}
.ey{font-family:var(--mono);font-size:9px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin-bottom:10px}
h1{font-size:34px;font-weight:700;letter-spacing:-.03em;line-height:1.05}
h2{font-size:24px;font-weight:700;letter-spacing:-.025em;line-height:1.1;margin-bottom:8px}
h3{font-size:11px;font-weight:600;margin-bottom:4px}
.lead{font-size:11px;color:var(--text-2);max-width:58ch;line-height:1.5}
.mu{font-size:9px;color:var(--muted)}
.pg-foot{margin-top:auto;padding-top:12px;border-top:1px solid var(--border);display:flex;justify-content:space-between;font-size:8px;color:var(--muted)}

.g2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.flex{display:flex}.fb{justify-content:space-between;align-items:center}.wrap{flex-wrap:wrap}.g6{gap:6px}.g10{gap:10px}

.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:12px}
.card-sm{padding:8px;font-size:8px}
.glass{background:color-mix(in srgb,var(--surface) 72%,transparent);backdrop-filter:blur(12px);border:1px solid color-mix(in srgb,var(--border) 80%,transparent);box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}

.bdg{display:inline-flex;align-items:center;padding:3px 8px;border-radius:999px;font-size:8px;font-weight:600;border:1px solid var(--border);background:var(--surface)}
.bdg-a{background:var(--accent-soft);border-color:color-mix(in srgb,var(--accent) 35%,transparent);color:var(--accent)}
.bdg-ok{background:rgba(5,150,105,.12);border-color:rgba(5,150,105,.3);color:var(--success)}

/* Browser mock */
.mock{border-radius:var(--radius-lg);border:1px solid var(--border);background:var(--surface);overflow:hidden;box-shadow:var(--shadow)}
.mock-bar{display:flex;align-items:center;gap:6px;padding:8px 10px;background:var(--surface-2);border-bottom:1px solid var(--border)}
.dots{display:flex;gap:4px}.dots i{width:8px;height:8px;border-radius:50%;display:block}
.dots i:nth-child(1){background:#f87171}.dots i:nth-child(2){background:#fbbf24}.dots i:nth-child(3){background:#34d399}
.mock-url{flex:1;font-family:var(--mono);font-size:8px;padding:4px 8px;border-radius:6px;background:var(--surface);border:1px solid var(--border);color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mock-body{display:flex;min-height:180px}
.mock-side{width:130px;background:var(--sidebar);padding:10px 8px;flex-shrink:0}
.mock-side .brand{font-size:9px;font-weight:700;color:var(--sidebar-text);margin-bottom:10px;display:flex;align-items:center;gap:4px}
.mock-side .brand::before{content:'';width:8px;height:8px;border-radius:2px;background:var(--accent)}
.nav-i{font-size:8px;padding:5px 7px;border-radius:6px;color:#94a3b8;margin-bottom:2px;cursor:pointer;transition:background .2s,color .2s}
.nav-i.on{background:rgba(37,99,235,.28);color:#fff}
.mock-main{flex:1;padding:10px;background:var(--bg);font-size:8px;overflow:hidden}
.kpi-r{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-bottom:8px}
.kpi{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:6px 8px}
.kpi label{display:block;font-size:7px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;font-family:var(--mono)}
.kpi strong{font-size:13px;font-weight:700;font-variant-numeric:tabular-nums}
.tbl{border:1px solid var(--border);border-radius:8px;overflow:hidden;font-size:8px;background:var(--surface)}
.tbl .r{display:grid;padding:5px 8px;border-bottom:1px solid var(--border);align-items:center}
.tbl .r.h{background:var(--surface-2);font-family:var(--mono);font-size:7px;text-transform:uppercase;color:var(--muted);letter-spacing:.05em}
.tbl .r:last-child{border-bottom:none}

.route-grid,.comp-grid{display:flex;flex-wrap:wrap;gap:4px;max-height:100%;overflow:hidden;align-content:flex-start}
.route-pill,.comp-pill{font-family:var(--mono);font-size:7px;padding:3px 6px;border-radius:5px;background:var(--surface);border:1px solid var(--border);color:var(--text-2);line-height:1.3}
.route-pill:hover,.comp-pill:hover{border-color:var(--accent);color:var(--accent)}
.sec-h{font-size:10px;font-weight:600;color:var(--accent);margin:10px 0 6px;padding-bottom:4px;border-bottom:1px solid var(--accent-soft)}

/* Brand grid cover */
.brand-grid{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);gap:6px;height:220px}
.brand-cell{border-radius:10px;border:1px solid var(--border);background:var(--surface);padding:10px;display:flex;flex-direction:column;justify-content:flex-end;font-size:8px;color:var(--muted)}
.brand-cell.hero{grid-column:span 2;grid-row:span 2;background:linear-gradient(145deg,var(--surface),var(--accent-soft));justify-content:center;align-items:flex-start;padding:16px}
.brand-cell.hero h2{font-size:20px;color:var(--text);margin:0}
.brand-cell.accent{background:var(--accent);color:#fff;border-color:transparent}

@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.55}}
.live-dot{width:6px;height:6px;border-radius:50%;background:var(--success);animation:pulse 2s ease infinite}
</style>
</head>
<body>
<div class="chrome" role="toolbar">
  <span class="logo">Continuum Brochure</span>
  <span class="stat">${inv.counts.pages} routes · ${inv.counts.views} views · ${inv.designSystem.length} DS · ${inv.ui.length} UI</span>
  <select id="portalSelect" aria-label="Preview portal">
    <option value="hr">HR Portal</option>
    <option value="admin">Admin</option>
    <option value="manager">Manager</option>
    <option value="employee">Employee</option>
  </select>
  <button type="button" id="themeBtn" aria-label="Toggle theme">Theme</button>
  <button type="button" onclick="window.print()">Print PDF</button>
  <select id="jumpNav" aria-label="Jump to page" style="max-width:140px">
    <option value="#p1">1 Cover</option><option value="#p2">2 Identity</option><option value="#p3">3 Admin</option>
    <option value="#p4">4 HR</option><option value="#p5">5 Mgr+Emp</option><option value="#p6">6 Super+Public</option>
    <option value="#p7">7 Routes A</option><option value="#p8">8 Routes B</option><option value="#p9">9 Views A</option>
    <option value="#p10">10 Views B</option><option value="#p11">11 Components</option><option value="#p12">12 APIs</option>
    <option value="#p13">13 Setup</option><option value="#p14">14 Security</option><option value="#p15">15 Roles</option>
    <option value="#p16">16 Why+Outcomes</option><option value="#p17">17 Assistant</option><option value="#p18">18 Motion</option>
    <option value="#p19">19 Integrations</option><option value="#p20">20 Narrative</option><option value="#p21">21 CTA</option>
  </select>
</div>

<!-- P1 COVER -->
<section class="spread" id="p1">
<div class="spread-inner">
<div class="ey">Continuum Pulse · B2B HRMS · India-first</div>
<div class="g2" style="flex:1;align-items:stretch">
<div style="display:flex;flex-direction:column;justify-content:center">
<h1>HR that runs itself</h1>
<p class="lead" style="margin:12px 0">Multi-tenant HRMS for Indian SMBs. ${inv.counts.pages} live routes, ${inv.modules.length} modules, 7 roles, 5 portals. Config-driven workflows, statutory payroll, invite-only access.</p>
<div class="flex wrap g6" style="margin-bottom:14px">
<span class="bdg bdg-a">15 modules</span><span class="bdg bdg-ok">145+ pages</span><span class="bdg">80+ permissions</span><span class="bdg">14 reports</span>
</div>
<div class="g4">
<div class="card" style="text-align:center"><strong style="font-size:18px;color:var(--accent);font-variant-numeric:tabular-nums">10m</strong><div class="mu">Onboarding</div></div>
<div class="card" style="text-align:center"><strong style="font-size:18px;color:var(--success)">99.9%</strong><div class="mu">Uptime</div></div>
<div class="card" style="text-align:center"><strong style="font-size:18px">3-tier</strong><div class="mu">Approvals</div></div>
<div class="card" style="text-align:center"><strong style="font-size:18px">${inv.counts.views}</strong><div class="mu">View comps</div></div>
</div>
</div>
<div id="liveMock" class="mock"></div>
</div>
<div class="pg-foot"><span>Continuum · 12×16 Complete Brochure</span><span>Page 1 · Generated ${inv.generatedAt.slice(0, 10)}</span></div>
</div>
</section>

<!-- P2 BRAND GRID -->
<section class="spread" id="p2">
<div class="spread-inner">
<div class="ey">Brand system</div>
<h2>Product identity</h2>
<div class="g2" style="flex:1">
<div class="brand-grid">
<div class="brand-cell hero"><div class="ey" style="margin-bottom:8px">Logo mark</div><h2>Continuum</h2><p class="mu" style="margin-top:6px">Infinite loop · people ops flow</p></div>
<div class="brand-cell"><strong style="color:var(--text)">#2563eb</strong><br/>Primary accent</div>
<div class="brand-cell accent"><strong>Geist / Outfit</strong><br/>Sans stack</div>
<div class="brand-cell"><span class="bdg bdg-a">Light</span> <span class="bdg">Dark</span><br/>Dual theme</div>
<div class="brand-cell"><strong style="font-family:var(--mono)">Aa Bb 0123</strong><br/>JetBrains Mono data</div>
<div class="brand-cell"><strong>Build better.</strong><br/>Tagline direction</div>
<div class="brand-cell"><div class="live-dot" style="margin-bottom:4px"></div>Live product</div>
</div>
<div>
<p class="lead" style="margin-bottom:10px">Stack: Next.js 15 · React 19 · TypeScript · Tailwind v4 · Prisma 7 · Neon PostgreSQL. Tagline: HR that runs itself.</p>
<div class="sec-h">Mandatory modules (always on)</div>
<div class="flex wrap g6">${inv.modules.filter(m=>m.mandatory).map(m=>`<span class="bdg bdg-ok">${m.id} ${m.slug}</span>`).join('')}</div>
<div class="sec-h">Optional modules (plan-gated)</div>
<div class="flex wrap g6">${inv.modules.filter(m=>!m.mandatory).map(m=>`<span class="bdg">${m.id} ${m.slug}</span>`).join('')}</div>
<div class="mock" style="margin-top:10px"><div class="mock-bar"><div class="dots"><i></i><i></i><i></i></div><div class="mock-url">continuum.app/admin/startup-readiness</div></div>
<div class="mock-main"><strong>Module Readiness</strong><p class="mu" style="margin-top:4px">Cap · enabled · nav · routes · APIs · RBAC · setup</p></div></div>
</div>
</div>
<div class="pg-foot"><span>Identity</span><span>Page 2</span></div>
</div>
</section>

<!-- P3 ADMIN ROUTES -->
<section class="spread" id="p3">
<div class="spread-inner">
<div class="ey">Portal · Admin · ${inv.portals.admin.length} routes</div>
<h2>Admin command center</h2>
<p class="lead" style="margin-bottom:8px">Company owner: setup wizard, RBAC, billing, module toggles, readiness score, approval chains.</p>
<div class="route-grid" style="flex:1;overflow:auto">${renderRouteGrid(inv.portals.admin, 4)}</div>
<div class="pg-foot"><span>Admin routes</span><span>Page 3</span></div>
</div>
</section>

<!-- P4 HR ROUTES -->
<section class="spread" id="p4">
<div class="spread-inner">
<div class="ey">Portal · HR · ${inv.portals.hr.length} routes</div>
<h2>HR operations surface</h2>
<p class="lead" style="margin-bottom:8px">Leave, attendance, payroll, compliance, recruitment, learning, workflow, reports.</p>
<div class="route-grid" style="flex:1;overflow:auto">${renderRouteGrid(inv.portals.hr, 4)}</div>
<div class="pg-foot"><span>HR routes</span><span>Page 4</span></div>
</div>
</section>

<!-- P5 MANAGER + EMPLOYEE -->
<section class="spread" id="p5">
<div class="spread-inner">
<div class="g2" style="flex:1;min-height:0">
<div style="display:flex;flex-direction:column;min-height:0">
<div class="ey">Manager · ${inv.portals.manager.length} routes</div>
<h2>Manager portal</h2>
<div class="route-grid" style="flex:1;overflow:auto;margin-bottom:10px">${renderRouteGrid(inv.portals.manager)}</div>
</div>
<div style="display:flex;flex-direction:column;min-height:0">
<div class="ey">Employee · ${inv.portals.employee.length} routes</div>
<h2>Employee self-service</h2>
<div class="route-grid" style="flex:1;overflow:auto">${renderRouteGrid(inv.portals.employee)}</div>
</div>
</div>
<div class="pg-foot"><span>Manager + Employee</span><span>Page 5</span></div>
</div>
</section>

<!-- P6 SUPER + PUBLIC -->
<section class="spread" id="p6">
<div class="spread-inner">
<div class="g2" style="flex:1">
<div>
<div class="ey">Super Admin · ${inv.portals.superAdmin.length} routes</div>
<h2>Platform operator</h2>
<div class="route-grid">${renderRouteGrid(inv.portals.superAdmin)}</div>
</div>
<div>
<div class="ey">Public · auth · onboarding</div>
<h2>Marketing &amp; access</h2>
<div class="route-grid">${renderRouteGrid(inv.pages.filter(p=>!p.startsWith('/admin')&&!p.startsWith('/hr')&&!p.startsWith('/manager')&&!p.startsWith('/employee')&&!p.startsWith('/super-admin')))}</div>
</div>
</div>
<div class="pg-foot"><span>Super + Public</span><span>Page 6</span></div>
</div>
</section>

<!-- P7 ALL PAGES chunk 1 -->
<section class="spread" id="p7">
<div class="spread-inner">
<div class="ey">Complete route registry · ${inv.counts.pages} pages</div>
<h2>Every app route (A-M)</h2>
<div class="route-grid" style="flex:1;overflow:auto">${renderRouteGrid(inv.pages.slice(0, Math.ceil(inv.pages.length / 2)))}</div>
<div class="pg-foot"><span>Routes A-M</span><span>Page 7</span></div>
</div>
</section>

<!-- P8 ALL PAGES chunk 2 -->
<section class="spread" id="p8">
<div class="spread-inner">
<div class="ey">Complete route registry</div>
<h2>Every app route (M-Z)</h2>
<div class="route-grid" style="flex:1;overflow:auto">${renderRouteGrid(inv.pages.slice(Math.ceil(inv.pages.length / 2)))}</div>
<div class="pg-foot"><span>Routes M-Z</span><span>Page 8</span></div>
</div>
</section>

<!-- P9 VIEW COMPONENTS chunk 1 -->
<section class="spread" id="p9">
<div class="spread-inner">
<div class="ey">${inv.counts.views} view components · pages/*-view.tsx</div>
<h2>Page views (part 1)</h2>
<div class="comp-grid" style="flex:1;overflow:auto">${renderList(inv.views.slice(0, Math.ceil(inv.views.length/2)))}</div>
<div class="pg-foot"><span>Views 1</span><span>Page 9</span></div>
</div>
</section>

<!-- P10 VIEW COMPONENTS chunk 2 -->
<section class="spread" id="p10">
<div class="spread-inner">
<div class="ey">View layer</div>
<h2>Page views (part 2)</h2>
<div class="comp-grid" style="flex:1;overflow:auto">${renderList(inv.views.slice(Math.ceil(inv.views.length/2)))}</div>
<div class="pg-foot"><span>Views 2</span><span>Page 10</span></div>
</div>
</section>

<!-- P11 COMPONENTS -->
<section class="spread" id="p11">
<div class="spread-inner">
<div class="ey">Component registry · codebase scan</div>
<h2>UI / UX components by layer</h2>
<div class="g2" style="flex:1;overflow:auto;font-size:8px">
<div>
${renderCategoryBlock('Design system', inv.componentCategories.designSystem)}
${renderCategoryBlock('UI primitives', inv.componentCategories.ui)}
${renderCategoryBlock('Layouts', inv.componentCategories.layouts)}
${renderCategoryBlock('Motion', inv.componentCategories.motion)}
</div>
<div>
${renderCategoryBlock('Assistant', inv.componentCategories.assistant)}
${renderCategoryBlock('Approval', inv.componentCategories.approval)}
${renderCategoryBlock('Invite', inv.componentCategories.invite)}
${renderCategoryBlock('Portals', inv.componentCategories.portals)}
${renderCategoryBlock('Marketing', inv.componentCategories.marketing)}
<div class="sec-h">Root shell (${inv.rootShell.length})</div>
<div class="comp-grid">${renderList(inv.rootShell)}</div>
</div>
</div>
<div class="pg-foot"><span>Components</span><span>Page 11</span></div>
</div>
</section>

<!-- P12 REPORTS + CRONS -->
<section class="spread" id="p12">
<div class="spread-inner">
<div class="g2" style="flex:1">
<div>
<div class="ey">Analytics CF-015</div>
<h2>Report APIs (${inv.reports.length})</h2>
<div class="route-grid">${renderRouteGrid(inv.reports)}</div>
</div>
<div>
<div class="ey">Automation</div>
<h2>Cron jobs (${inv.crons.length})</h2>
<div class="route-grid">${renderRouteGrid(inv.crons)}</div>
<div class="sec-h">Webhooks</div>
<div class="route-grid"><span class="route-pill">/api/webhooks/razorpay</span><span class="route-pill">/api/webhooks/cashfree</span></div>
<div class="sec-h">Assistant</div>
<div class="route-grid"><span class="route-pill">/api/ai/assistant</span><span class="route-pill">/api/search/global</span></div>
</div>
</div>
<div class="pg-foot"><span>APIs</span><span>Page 12</span></div>
</div>
</section>

<!-- P13 SETUP + ONBOARDING -->
<section class="spread" id="p13">
<div class="spread-inner">
<div class="ey">Organization setup · 27 cards · 7 categories</div>
<h2>Setup hub &amp; onboarding</h2>
<div class="g3" style="font-size:8px;flex:1;overflow:auto">
<div class="card"><h3>Organization</h3><p class="mu">company_profile, departments, locations</p></div>
<div class="card"><h3>People</h3><p class="mu">employees, roles, job_titles</p></div>
<div class="card"><h3>Attendance</h3><p class="mu">shifts</p></div>
<div class="card"><h3>Leave</h3><p class="mu">holidays, leave_types, leave_approvals</p></div>
<div class="card"><h3>Payroll</h3><p class="mu">salary_structure, statutory, pf_setup</p></div>
<div class="card"><h3>Workflows</h3><p class="mu">notifications, workflows, integrations</p></div>
<div class="card"><h3>Extensions</h3><p class="mu">performance, recruitment, learning, documents, exit, expenses, reimbursements, directory, analytics, compliance</p></div>
<div class="card"><h3>Onboarding</h3><p class="mu">/onboarding · /onboarding/company · /invite/accept/[token] · /employee/welcome</p></div>
<div class="card"><h3>Auth</h3><p class="mu">/sign-in · forgot-password · reset-password · email verification</p></div>
</div>
<div class="pg-foot"><span>Setup</span><span>Page 13</span></div>
</div>
</section>

<!-- P14 SECURITY + RBAC -->
<section class="spread" id="p14">
<div class="spread-inner">
<div class="ey">Enterprise trust</div>
<h2>Security &amp; RBAC</h2>
<div class="g2" style="flex:1">
<div class="g2" style="grid-template-columns:1fr 1fr;gap:8px">
<div class="card glass"><h3>Tenant isolation</h3><p class="mu">org_id on every query · 403 cross-tenant</p></div>
<div class="card glass"><h3>Module gating</h3><p class="mu">nav · route · API 403 MODULE_DISABLED</p></div>
<div class="card glass"><h3>Audit trail</h3><p class="mu">actor · timestamp · hash chain</p></div>
<div class="card glass"><h3>Rate limiting</h3><p class="mu">Upstash Redis · auth protected</p></div>
</div>
<div class="mock"><div class="mock-bar"><div class="dots"><i></i><i></i><i></i></div><div class="mock-url">continuum.app/admin/rbac</div></div>
<div class="mock-main"><strong>80+ permissions</strong> across leave, attendance, payroll, employee, company, reports, audit, security, performance, recruitment, workflow, reimbursement, LMS, compensation, travel/expense, platform</div></div>
</div>
<div class="pg-foot"><span>Security</span><span>Page 14</span></div>
</div>
</section>

<!-- P15 ROLES -->
<section class="spread" id="p15">
<div class="spread-inner">
<div class="ey">7 roles · 5 portals</div>
<h2>Role-by-role access</h2>
<div class="tbl" style="font-size:8px;margin-bottom:10px">
<div class="r h" style="grid-template-columns:.9fr 1fr 1.2fr"><span>Role</span><span>Portal</span><span>Scope</span></div>
<div class="r" style="grid-template-columns:.9fr 1fr 1.2fr"><span>super_admin</span><span>/super-admin</span><span>Platform wildcard *</span></div>
<div class="r" style="grid-template-columns:.9fr 1fr 1.2fr"><span>admin</span><span>/admin</span><span>Company all · billing · RBAC</span></div>
<div class="r" style="grid-template-columns:.9fr 1fr 1.2fr"><span>hr</span><span>/hr</span><span>Company all employees · payroll · compliance</span></div>
<div class="r" style="grid-template-columns:.9fr 1fr 1.2fr"><span>director</span><span>/manager</span><span>Department + children</span></div>
<div class="r" style="grid-template-columns:.9fr 1fr 1.2fr"><span>manager</span><span>/manager</span><span>Reports 4 levels · approvals</span></div>
<div class="r" style="grid-template-columns:.9fr 1fr 1.2fr"><span>team_lead</span><span>/manager</span><span>Direct reports only</span></div>
<div class="r" style="grid-template-columns:.9fr 1fr 1.2fr"><span>employee</span><span>/employee</span><span>Self-service only</span></div>
</div>
<p class="lead">Portal switcher · Cmd+K global search · notification bell · Continuum Assistant on every portal shell.</p>
<div class="pg-foot"><span>Roles</span><span>Page 15</span></div>
</div>
</section>

<!-- P16 WHY + OUTCOMES -->
<section class="spread" id="p16">
<div class="spread-inner">
<div class="g2" style="flex:1">
<div>
<div class="ey">Why agencies choose Continuum</div>
<h2>Outcomes, not feature lists</h2>
<div class="g2" style="gap:8px;margin-top:8px">
<div class="card" style="border-left:3px solid var(--accent)"><strong style="font-size:16px;color:var(--accent)">-70%</strong><p class="mu">HR admin time vs spreadsheets</p></div>
<div class="card" style="border-left:3px solid var(--success)"><strong style="font-size:16px;color:var(--success)">&lt;30s</strong><p class="mu">Manager: who is out today</p></div>
<div class="card" style="border-left:3px solid var(--warn)"><strong style="font-size:16px;color:var(--warn)">Day 1</strong><p class="mu">Invite to first leave same day</p></div>
<div class="card"><strong style="font-size:16px">0</strong><p class="mu">Manual PF/ESI/TDS recalc errors</p></div>
</div>
</div>
<div>
<div class="ey">Why needed</div>
<h2>Problem vs solution</h2>
<div class="card" style="margin-bottom:8px;border-left:3px solid var(--danger)"><h3>Without</h3><p class="mu">WhatsApp approvals · Excel payroll · no audit · manager pings HR</p></div>
<div class="card" style="border-left:3px solid var(--success)"><h3>With Continuum</h3><p class="mu">Workflow engine · statutory payroll · hash audit · manager dashboard</p></div>
</div>
</div>
<div class="pg-foot"><span>Why + Outcomes</span><span>Page 16</span></div>
</div>
</section>

<!-- P17 ASSISTANT -->
<section class="spread" id="p17">
<div class="spread-inner">
<div class="ey">POST /api/ai/assistant · human-in-the-loop</div>
<h2>Continuum Assistant</h2>
<div class="g2" style="flex:1">
<div style="font-size:8px">
<div class="sec-h">Confirmed actions</div>
<p class="mu">request_leave · approve_leave · reject_leave (confirm before execute)</p>
<div class="sec-h">Insights</div>
<p class="mu">Leave balance · constraint explainer · smart dates · approval queue · policy chain · payslip lines · setup snapshot · payroll preflight · bulk import preview · invite help · onboarding drafts</p>
<div class="sec-h">OpenAI fallback</div>
<p class="mu">gpt-4o-mini when OPENAI_API_KEY set · role-aware · no other employees data</p>
</div>
<div class="mock"><div class="mock-bar"><div class="dots"><i></i><i></i><i></i></div><div class="mock-url">Assistant widget</div></div>
<div class="mock-main" style="padding:12px">
<div class="card card-sm" style="margin-bottom:6px;background:var(--accent-soft)"><strong>You:</strong> Why blocked Dec 24-26?</div>
<div class="card card-sm" style="margin-bottom:6px"><strong>Continuum:</strong> Year-end blackout. Suggest Dec 19-20.</div>
<div class="card card-sm" style="background:rgba(5,150,105,.1)"><strong>Draft:</strong> 2d casual Dec 19-20 <span class="bdg bdg-a">Confirm</span></div>
</div></div>
</div>
<div class="pg-foot"><span>Assistant</span><span>Page 17</span></div>
</div>
</section>

<!-- P18 MOTION + MARKETING VIEWS -->
<section class="spread" id="p18">
<div class="spread-inner">
<div class="ey">Experience layer</div>
<h2>Motion, marketing, shared views</h2>
<div class="comp-grid" style="flex:1;overflow:auto">
${renderList(inv.componentCategories.motion)}
${renderList(inv.componentCategories.marketing)}
${renderList(inv.views.filter(v=>v.includes('pages/shared')||v.includes('pages/_shared')))}
</div>
<div class="pg-foot"><span>Motion + shared</span><span>Page 18</span></div>
</div>
</section>

<!-- P19 INTEGRATIONS -->
<section class="spread" id="p19">
<div class="spread-inner">
<div class="ey">Platform stack</div>
<h2>Integrations &amp; infrastructure</h2>
<div class="g3" style="font-size:8px;flex:1">
<div class="card"><h3>Data</h3><p class="mu">Neon PostgreSQL · Prisma · Appwrite storage optional</p></div>
<div class="card"><h3>Payments</h3><p class="mu">Cashfree primary · Razorpay alternate · plan module clamp</p></div>
<div class="card"><h3>Auth</h3><p class="mu">JWT refresh · Neon Auth optional · invite-only</p></div>
<div class="card"><h3>Comms</h3><p class="mu">Pusher realtime · SMTP SendGrid SES Resend</p></div>
<div class="card"><h3>AI</h3><p class="mu">OpenAI · smart leave engine · assistant widget</p></div>
<div class="card"><h3>Ops</h3><p class="mu">Sentry · Better Stack · UptimeRobot · Vercel</p></div>
</div>
<div class="pg-foot"><span>Integrations</span><span>Page 19</span></div>
</div>
</section>

<!-- P20 NARRATIVE -->
<section class="spread" id="p20">
<div class="spread-inner">
<div class="g2" style="flex:1">
<div>
<div class="ey">Typical day · Acme Agency</div>
<h2>Narrative walkthrough</h2>
<div style="font-size:8px;line-height:1.6">
<p style="border-left:3px solid var(--accent);padding-left:10px;margin-bottom:8px"><strong>8:45 Employee</strong> Clock WFH · submit 2d leave · constraint OK</p>
<p style="border-left:3px solid var(--accent);padding-left:10px;margin-bottom:8px"><strong>9:10 Manager</strong> Bulk approve · calendar updates via Pusher</p>
<p style="border-left:3px solid var(--accent);padding-left:10px;margin-bottom:8px"><strong>11:30 HR</strong> SLA alert on reimbursement · escalation view</p>
<p style="border-left:3px solid var(--accent);padding-left:10px"><strong>5:30 HR</strong> Payroll preflight · approve run · payslips Friday</p>
</div>
</div>
<div>
<div class="ey">Honest expectations</div>
<h2>Is / Is not</h2>
<div class="card" style="background:rgba(5,150,105,.08);margin-bottom:8px"><h3>IS</h3><p class="mu">Full HRMS · config workflows · multi-tenant · statutory payroll · invite-only · ${inv.counts.pages} routes</p></div>
<div class="card" style="background:rgba(220,38,38,.06)"><h3>IS NOT</h3><p class="mu">CRM · CA replacement · biometric hardware · public signup · offline-first native app</p></div>
</div>
</div>
<div class="pg-foot"><span>Narrative</span><span>Page 20</span></div>
</div>
</section>

<!-- P21 CTA -->
<section class="spread" id="p21">
<div class="spread-inner" style="justify-content:center;text-align:center">
<div class="ey">Ready to ship</div>
<h1 style="font-size:36px;margin-bottom:12px">Your team deserves software that feels inevitable</h1>
<p class="lead" style="margin:0 auto 16px">Bento dashboards · real-time approvals · India-ready payroll · role portals · ${inv.counts.pages} routes · ${inv.counts.views} views · one codebase.</p>
<span class="bdg bdg-a" style="font-size:11px;padding:8px 16px">continuum.app/sign-in?inviteOnly=1</span>
<div class="pg-foot"><span>Continuum · HR that runs itself</span><span>Page 21 · End</span></div>
</div>
</section>

<script>
const INVENTORY = ${JSON.stringify(inv)};
const PORTAL_NAV = ${JSON.stringify(portalNav)};
const KPI = { pending: 7, absent: 4, payroll: 'Review', sla: 3 };

function buildMock(portal) {
  const nav = PORTAL_NAV[portal] || PORTAL_NAV.hr;
  const url = 'continuum.app/' + portal + '/dashboard';
  return \`<div class="mock-bar"><div class="dots"><i></i><i></i><i></i></div><div class="mock-url">\${url}</div></div>
  <div class="mock-body"><aside class="mock-side"><div class="brand">Continuum</div>
  \${nav.map((n,i)=>\`<div class="nav-i \${i===0?'on':''}">\${n}</div>\`).join('')}
  </aside><div class="mock-main"><div class="fb" style="margin-bottom:6px"><strong>Command Center</strong><span class="bdg bdg-a">Live</span></div>
  <div class="kpi-r"><div class="kpi"><label>Pending</label><strong>\${KPI.pending}</strong></div><div class="kpi"><label>Absent</label><strong>\${KPI.absent}</strong></div>
  <div class="kpi"><label>Payroll</label><strong style="color:var(--warn)">\${KPI.payroll}</strong></div><div class="kpi"><label>SLA</label><strong style="color:var(--danger)">\${KPI.sla}</strong></div></div>
  <div class="tbl"><div class="r h" style="grid-template-columns:1.5fr 1fr .8fr"><span>Employee</span><span>Type</span><span>Status</span></div>
  <div class="r" style="grid-template-columns:1.5fr 1fr .8fr"><span>Priya Sharma</span><span>Casual 2d</span><span class="bdg bdg-a">52h</span></div>
  <div class="r" style="grid-template-columns:1.5fr 1fr .8fr"><span>Arjun Kumar</span><span>WFH</span><span class="bdg bdg-ok">OK</span></div></div></div></div>\`;
}

const mockEl = document.getElementById('liveMock');
const portalSelect = document.getElementById('portalSelect');
function renderMock() { mockEl.innerHTML = buildMock(portalSelect.value); }
portalSelect.addEventListener('change', renderMock);
renderMock();

const themeBtn = document.getElementById('themeBtn');
const htmlEl = document.documentElement;
function applyTheme(t) { htmlEl.setAttribute('data-theme', t); localStorage.setItem('continuum-brochure-theme', t); themeBtn.textContent = t === 'dark' ? 'Light mode' : 'Dark mode'; }
const saved = localStorage.getItem('continuum-brochure-theme') || 'dark';
applyTheme(saved);
themeBtn.addEventListener('click', () => applyTheme(htmlEl.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));

document.querySelectorAll('.route-pill').forEach(el => {
  el.addEventListener('click', () => {
    const route = el.dataset.route || '';
    portalSelect.value = route.startsWith('/admin') ? 'admin' : route.startsWith('/manager') ? 'manager' : route.startsWith('/employee') ? 'employee' : 'hr';
    renderMock();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

document.getElementById('jumpNav').addEventListener('change', (e) => {
  const t = document.querySelector(e.target.value);
  if (t) t.scrollIntoView({ behavior: 'smooth' });
});

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let n = KPI.pending;
  setInterval(() => { n = n > 2 ? n - 1 : 7; KPI.pending = n; renderMock(); }, 4000);
}
</script>
</body>
</html>`;

const outPath = path.join(process.cwd(), 'docs/marketing/continuum-brochure-12x16.html');
fs.writeFileSync(outPath, html);
console.log('Built', outPath, 'bytes:', html.length);
