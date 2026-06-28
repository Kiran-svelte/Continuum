import type { PortalSlug } from '@/lib/navigation/portal-nav';
import type { ModuleSlug } from '@/lib/core-functions/catalog';
import { buildPortalNav } from '@/lib/navigation/portal-nav';
import type { AssistantContext, AssistantLink, AssistantReply } from '@/lib/continuum-assistant/types';

function roleToPortalSlug(role: string): PortalSlug {
  const normalized = role.toLowerCase();
  if (normalized === 'admin') return 'admin';
  if (normalized === 'hr') return 'hr';
  if (normalized === 'manager' || normalized === 'director' || normalized === 'team_lead') return 'manager';
  return 'employee';
}

export function buildNavHintsForRole(
  role: string,
  enabledModules: string[],
  permissions: string[] = []
): Array<{ label: string; href: string }> {
  const portalSlug = roleToPortalSlug(role);
  const items = buildPortalNav(
    portalSlug,
    enabledModules as ModuleSlug[],
    permissions
  );
  return items.map((item) => ({ label: item.label, href: item.href }));
}

export function resolvePortalSlugFromRole(role: string): PortalSlug {
  return roleToPortalSlug(role);
}

type TopicRule = {
  id: string;
  patterns: RegExp[];
  reply: (ctx: AssistantContext) => string;
  links?: (ctx: AssistantContext) => AssistantLink[];
  suggestions?: string[];
};

function hasEnabledModule(ctx: AssistantContext, slug: ModuleSlug): boolean {
  return ctx.enabledModules.includes(slug);
}

function findNavMatch(message: string, ctx: AssistantContext): AssistantLink | null {
  const query = message.toLowerCase();
  const tokens = query.split(/\s+/).filter((t) => t.length > 2);
  let best: { label: string; href: string; score: number } | null = null;

  for (const item of ctx.navHints) {
    const label = item.label.toLowerCase();
    let score = 0;
    if (query.includes(label)) score += 5;
    for (const token of tokens) {
      if (label.includes(token)) score += 2;
      if (token === 'leave' && label.includes('leave')) score += 3;
      if (token === 'payroll' && (label.includes('payroll') || label.includes('payslip'))) score += 3;
      if (token === 'attendance' && label.includes('attendance')) score += 3;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { ...item, score };
    }
  }

  return best ? { label: best.label, href: best.href } : null;
}

const TOPIC_RULES: TopicRule[] = [
  {
    id: 'greeting',
    patterns: [/^(hi|hello|hey|help|start)\b/i, /good\s+(morning|afternoon|evening)/i],
    reply: (ctx) =>
      `Hi ${ctx.displayName.split(' ')[0] || 'there'}! I'm your Continuum guide. I can help you find features, explain leave and payroll basics, and point you to setup steps. What would you like help with?`,
    suggestions: [
      'Where do I request leave?',
      'How do I view my payslip?',
      'Explain leave balance',
    ],
  },
  {
    id: 'request-leave',
    patterns: [
      /request\s+leave/i,
      /apply\s+for\s+leave/i,
      /book\s+leave/i,
      /time\s+off/i,
      /on (my )?behalf/i,
      /behalf of me/i,
      /request (it )?for me/i,
      /submit (it )?for me/i,
      /need you to request/i,
    ],
    reply: () =>
      'Say **"request sick leave"** here and I will collect dates and reason, then ask you to **confirm** before submitting (same rules as the form). Or open **Request Leave** in the sidebar for the full wizard.',
    links: (ctx) => [{ label: 'Request Leave', href: `/${ctx.portalSlug}/request-leave` }],
    suggestions: ['What is leave balance?', 'Where are my pending leaves?'],
  },
  {
    id: 'leave-balance',
    patterns: [/leave\s+balance/i, /how\s+many\s+days/i, /remaining\s+leave/i, /quota/i],
    reply: () =>
      'Ask me directly, e.g. **"How many sick leave days do I have?"** — I can read **your** balances from the system (not other people\'s). You can also see balances on **Request Leave** when you pick a leave type.',
    links: (ctx) => [
      { label: 'Request Leave', href: `/${ctx.portalSlug}/request-leave` },
      ...(ctx.portalSlug === 'employee'
        ? [{ label: 'Leave History', href: '/employee/leave-history' }]
        : [{ label: 'Leave Balance', href: '/hr/leave-balance' }]),
    ],
  },
  {
    id: 'leave-approval',
    patterns: [/approve\s+leave/i, /pending\s+approval/i, /leave\s+approval/i, /escalat/i],
    reply: (ctx) =>
      ctx.portalSlug === 'employee'
        ? 'After you submit, your manager (or HR) approves under **Approvals** or **Leave Requests**. You will get a notification when the status changes.'
        : 'Say **"approve leave"** and I will show the next request assigned to you, then ask you to **confirm** before approving. Or use **Approvals** / **Leave Requests** in the sidebar.',
    links: (ctx) => {
      if (ctx.portalSlug === 'manager') {
        return [{ label: 'Approvals', href: '/manager/approvals' }];
      }
      if (ctx.portalSlug === 'hr' || ctx.portalSlug === 'admin') {
        return [
          { label: 'Leave Requests', href: `/${ctx.portalSlug}/leave-requests` },
          { label: 'Escalation', href: '/hr/escalation' },
        ];
      }
      return [{ label: 'Leave History', href: '/employee/leave-history' }];
    },
  },
  {
    id: 'payslip',
    patterns: [/payslip/i, /salary\s+slip/i, /download\s+pay/i, /net\s+pay/i],
    reply: () =>
      'Everyone on payroll sees **My Payslips** for their own slips. HR runs company payroll from **Payroll** and publishes slips after each run. If a slip is missing, the run may not be finalized yet—check with HR.',
    links: (ctx) => {
      const payslipHref =
        ctx.portalSlug === 'manager'
          ? '/manager/payslips'
          : ctx.portalSlug === 'hr'
            ? '/hr/payslips'
            : ctx.portalSlug === 'admin'
              ? '/admin/payslips'
              : '/employee/payslips';
      if (ctx.portalSlug === 'employee' || ctx.portalSlug === 'manager' || ctx.portalSlug === 'admin') {
        return [{ label: 'My Payslips', href: payslipHref }];
      }
      return [
        { label: 'My Payslips', href: payslipHref },
        { label: 'Payroll', href: '/hr/payroll' },
      ];
    },
  },
  {
    id: 'payroll-calc',
    patterns: [/salary\s+calculat/i, /payroll\s+calculat/i, /how\s+is\s+.*\s+calculated/i, /ctc/i, /deduction/i, /component/i],
    reply: () =>
      'Continuum payroll uses your **Salary Structure** (earnings/deductions) assigned to you, then monthly payroll runs apply attendance/leave and statutory rules. HR configures structures under **Salary Structures** and **Salary Components**, then processes **Payroll**. Employees only see finalized amounts on **Payslips**—not the full calculation worksheet unless HR shares it.',
    links: (ctx) => {
      const payslipHref =
        ctx.portalSlug === 'manager'
          ? '/manager/payslips'
          : ctx.portalSlug === 'hr'
            ? '/hr/payslips'
            : ctx.portalSlug === 'admin'
              ? '/admin/payslips'
              : '/employee/payslips';
      if (ctx.portalSlug === 'employee' || ctx.portalSlug === 'manager') {
        return [{ label: 'My Payslips', href: payslipHref }];
      }
      return [
        { label: 'My Payslips', href: payslipHref },
        { label: 'Payroll', href: '/hr/payroll' },
        { label: 'Salary Structures', href: '/hr/salary-structures' },
      ];
    },
  },
  {
    id: 'company-setup',
    patterns: [/setup/i, /onboarding/i, /wizard/i, /configure/i, /company\s+settings/i, /organization\s+setup/i],
    reply: (ctx) =>
      ctx.portalSlug === 'admin'
        ? 'Company admins should complete **Getting Started** and **Organization Setup** (setup wizard) first: org structure, leave types, holidays, approval chains, and modules. Ongoing changes live under **Settings** (Company Settings).'
        : 'Initial company setup is done by your admin in **Organization Setup** / onboarding. For day-to-day policy changes, contact your HR or admin team—they use **Company Settings** and **Policy Settings**.',
    links: (ctx) =>
      ctx.portalSlug === 'admin'
        ? [
            { label: 'Getting Started', href: '/admin/getting-started' },
            { label: 'Organization Setup', href: '/admin/setup-wizard' },
            { label: 'Company Settings', href: '/admin/company-settings' },
          ]
        : [{ label: 'Profile', href: `/${ctx.portalSlug}/profile` }],
  },
  {
    id: 'invite',
    patterns: [/invite/i, /add\s+employee/i, /new\s+hire/i, /provision/i],
    reply: (ctx) =>
      ctx.portalSlug === 'employee'
        ? 'Only HR, managers, or admins can invite colleagues. Ask your HR team to send an invite from **People** or **Employees**.'
        : 'Send invites from **People** (Admin) or **Employees → Invite** (HR). Choose role and email; the invitee receives a link to set a password or sign in with a temporary password.',
    links: (ctx) =>
      ctx.portalSlug === 'admin'
        ? [{ label: 'People', href: '/admin/people' }]
        : [{ label: 'Employees', href: '/hr/employees' }],
  },
  {
    id: 'regularization',
    patterns: [
      /regularization/i,
      /regularis/i,
      /why.*regulariz/i,
      /what\s+is\s+regulariz/i,
      /attendance\s+correction/i,
    ],
    reply: (ctx) =>
      ctx.portalSlug === 'employee'
        ? '**Attendance regularization** is used when your clock-in/out was missed, wrong, or on a holiday/week-off and you need HR/manager approval to fix the record. Open **Attendance**, submit a regularization request with the correct date/time and reason. Until it is approved, payroll and attendance reports may show gaps.'
        : '**Attendance regularization** corrects attendance records after the fact (missed punch, wrong shift, on leave but marked absent, etc.). Employees submit from **Attendance**; managers approve under **Approvals** or team attendance views; HR can configure rules under **Shifts** and **Attendance** settings. Payroll generation may block or warn if regularizations are still pending.',
    links: (ctx) => [
      { label: 'Attendance', href: `/${ctx.portalSlug}/attendance` },
      ...(ctx.portalSlug === 'manager'
        ? [{ label: 'Approvals', href: '/manager/approvals' }]
        : []),
    ],
    suggestions: ['Where is my attendance?', 'How does payroll use attendance?'],
  },
  {
    id: 'attendance',
    patterns: [/attendance/i, /clock\s*in/i, /shift/i],
    reply: () =>
      'Mark attendance from **Attendance**. If you need corrections, use **regularization** (where enabled). HR configures shifts under **Shifts** and reviews team attendance on **Team Attendance** (managers).',
    links: (ctx) => [
      {
        label: 'My Attendance',
        href:
          ctx.portalSlug === 'employee'
            ? '/employee/attendance'
            : `/${ctx.portalSlug}/my-attendance`,
      },
      ...(ctx.portalSlug === 'hr' || ctx.portalSlug === 'manager'
        ? [
            {
              label: 'Team Attendance',
              href:
                ctx.portalSlug === 'manager' ? '/manager/team-attendance' : '/hr/attendance',
            },
          ]
        : []),
    ],
  },
  {
    id: 'what-is',
    patterns: [/what\s+is\s+continuum/i, /how\s+does\s+continuum/i, /pulse/i],
    reply: (ctx) =>
      `Continuum Pulse is your company's HR workspace (${ctx.companyName}). Your role is **${ctx.role}**. Use the sidebar to navigate modules enabled for your organization—leave, attendance, payroll, and more.`,
    suggestions: ['Where do I request leave?', 'Where is company settings?'],
  },
];

export function answerWithKnowledge(message: string, ctx: AssistantContext): AssistantReply | null {
  const trimmed = message.trim();
  if (!trimmed) {
    return {
      reply: 'Ask me anything about using Continuum—navigation, leave, payroll, or setup.',
      links: [],
      suggestions: ['Where do I request leave?', 'How do I view payslips?'],
      source: 'rules',
    };
  }

  for (const rule of TOPIC_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(trimmed))) {
      if ((rule.id === 'payslip' || rule.id === 'payroll-calc') && !hasEnabledModule(ctx, 'payroll')) {
        return {
          reply:
            'MODULE_DISABLED: Payroll is not enabled for your company. I cannot show payslip pages or payroll actions until an admin enables the payroll module.',
          links: [],
          suggestions: [],
          source: 'rules',
        };
      }
      return {
        reply: rule.reply(ctx),
        links: rule.links?.(ctx) ?? [],
        suggestions: rule.suggestions ?? [],
        source: 'rules',
      };
    }
  }

  const navMatch = findNavMatch(trimmed, ctx);
  if (navMatch && /where|find|open|go\s+to|navigate|locate|which\s+menu/i.test(trimmed)) {
    return {
      reply: `You can open **${navMatch.label}** from the sidebar, or use the search bar at the top (Ctrl+K) and type "${navMatch.label}".`,
      links: [navMatch],
      suggestions: [],
      source: 'rules',
    };
  }

  if (/where|find|how\s+do\s+i|which\s+page|menu/i.test(trimmed)) {
    const guess = findNavMatch(trimmed, ctx);
    if (guess) {
      return {
        reply: `Try **${guess.label}** in the sidebar (${guess.href}).`,
        links: [guess],
        suggestions: [],
        source: 'rules',
      };
    }
    return {
      reply:
        'Tell me what you want to do (e.g. "request leave", "payslip", "approve team leave"), and I will point you to the right page. You can also press **Ctrl+K** to search the menu.',
      links: [],
      suggestions: ['Request leave', 'View payslips', 'Team approvals'],
      source: 'rules',
    };
  }

  return null;
}

export function getDefaultSuggestions(role: string): string[] {
  const portal = roleToPortalSlug(role);
  if (portal === 'admin') {
    return ['How do I finish company setup?', 'Where are leave settings?', 'Invite a new employee'];
  }
  if (portal === 'hr') {
    return ['Process payroll', 'Approve leave requests', 'Configure holidays'];
  }
  if (portal === 'manager') {
    return ['Approve team leave', 'View team calendar', 'Request my own leave'];
  }
  return ['Request leave', 'Check leave balance', 'View my payslip'];
}
