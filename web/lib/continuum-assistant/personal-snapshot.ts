import prisma from '@/lib/prisma';
import { assertModule } from '@/lib/core-functions/assert-module';
import type { AssistantContext, AssistantReply } from '@/lib/continuum-assistant/types';

export type PersonalLeaveBalance = {
  leaveType: string;
  displayName: string;
  available: number;
  used: number;
  pending: number;
  entitlement: number;
  carriedForward: number;
};

export type AssistantPersonalSnapshot = {
  year: number;
  leaveBalances: PersonalLeaveBalance[];
  pendingLeaveRequests: number;
};

const PERSONAL_QUERY =
  /\b(balance|balances|how\s+many|days\s+left|remaining|available|quota|entitlement|have\s+left)\b/i;
const LEAVE_CONTEXT =
  /\b(leave|sick|casual|annual|earned|privilege|pto|time\s*off|vacation|maternity|paternity)\b/i;
const TEAM_OTHER_QUERY =
  /\b(team|colleague|employee|staff|report|john|jane|his\s+balance|her\s+balance|their\s+balance|someone\s+else|other\s+person)\b/i;

function remainingDays(b: {
  annual_entitlement: number;
  carried_forward: number;
  used_days: number;
  pending_days: number;
  encashed_days: number;
}): number {
  return Math.max(
    0,
    b.annual_entitlement +
      b.carried_forward -
      b.used_days -
      b.pending_days -
      b.encashed_days
  );
}

/**
 * Loads leave balances and pending count for the authenticated employee only.
 * Scoped by emp_id + company_id — never accepts another employee id from the client.
 */
export async function loadAssistantPersonalSnapshot(
  employeeId: string,
  companyId: string
): Promise<AssistantPersonalSnapshot | null> {
  const moduleGuard = await assertModule(companyId, 'leave');
  if (moduleGuard) return null;

  const year = new Date().getUTCFullYear();

  const [balances, leaveTypes, pendingLeaveRequests] = await Promise.all([
    prisma.leaveBalance.findMany({
      where: { emp_id: employeeId, year },
      orderBy: { leave_type: 'asc' },
    }),
    prisma.leaveType.findMany({
      where: { company_id: companyId, is_active: true, deleted_at: null },
      select: { code: true, name: true },
    }),
    prisma.leaveRequest.count({
      where: { emp_id: employeeId, company_id: companyId, status: 'pending' },
    }),
  ]);

  const nameByCode = new Map(
    leaveTypes.map((lt) => [lt.code.toLowerCase(), lt.name || lt.code])
  );

  const leaveBalances: PersonalLeaveBalance[] = balances.map((b) => ({
    leaveType: b.leave_type,
    displayName: nameByCode.get(b.leave_type.toLowerCase()) ?? b.leave_type,
    available: Math.round(remainingDays(b) * 10) / 10,
    used: b.used_days,
    pending: b.pending_days,
    entitlement: b.annual_entitlement,
    carriedForward: b.carried_forward,
  }));

  return { year, leaveBalances, pendingLeaveRequests };
}

export function isPersonalDataQuery(message: string): boolean {
  const trimmed = message.trim();
  if (TEAM_OTHER_QUERY.test(trimmed)) {
    return false;
  }
  return PERSONAL_QUERY.test(trimmed) && LEAVE_CONTEXT.test(trimmed);
}

export function isTeamDataQuery(message: string): boolean {
  return TEAM_OTHER_QUERY.test(message.trim()) && LEAVE_CONTEXT.test(message.trim());
}

function normalizeToken(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function matchLeaveType(
  message: string,
  balances: PersonalLeaveBalance[]
): PersonalLeaveBalance | null {
  const msg = message.toLowerCase();
  const aliases: Record<string, string[]> = {
    sick: ['sick', 'medical', 'illness'],
    casual: ['casual'],
    annual: ['annual', 'privilege', 'earned', 'vacation', 'pto'],
    maternity: ['maternity'],
    paternity: ['paternity'],
  };

  for (const balance of balances) {
    const code = balance.leaveType.toLowerCase();
    const display = balance.displayName.toLowerCase();
    if (msg.includes(code) || msg.includes(display)) {
      return balance;
    }
    for (const [key, words] of Object.entries(aliases)) {
      if (words.some((w) => msg.includes(w))) {
        if (code.includes(key) || display.includes(key) || normalizeToken(code).includes(key)) {
          return balance;
        }
      }
    }
  }

  return null;
}

export function formatPersonalSnapshotForPrompt(snapshot: AssistantPersonalSnapshot): string {
  if (snapshot.leaveBalances.length === 0) {
    return `Leave balances (${snapshot.year}): none on file yet. Pending leave requests: ${snapshot.pendingLeaveRequests}.`;
  }
  const lines = snapshot.leaveBalances.map(
    (b) =>
      `- ${b.displayName} (${b.leaveType}): ${b.available} days available (used ${b.used}, pending ${b.pending}, entitlement ${b.entitlement}${b.carriedForward ? `, carried forward ${b.carriedForward}` : ''})`
  );
  return `Your leave balances for ${snapshot.year} (this user only):\n${lines.join('\n')}\nPending leave requests: ${snapshot.pendingLeaveRequests}.`;
}

export function answerPersonalLeaveQuery(
  message: string,
  snapshot: AssistantPersonalSnapshot,
  ctx: AssistantContext
): AssistantReply | null {
  const requestLeaveHref =
    ctx.portalSlug === 'employee'
      ? '/employee/request-leave'
      : `/${ctx.portalSlug}/request-leave`;

  if (snapshot.leaveBalances.length === 0) {
    return {
      reply:
        `I do not see any leave balances on your account for ${snapshot.year} yet. Your HR team may still be setting up quotas. You have **${snapshot.pendingLeaveRequests}** pending leave request(s).`,
      links: [{ label: 'Request Leave', href: requestLeaveHref }],
      suggestions: ['Where do I request leave?', 'Contact HR about quotas'],
      source: 'rules',
    };
  }

  const specific = matchLeaveType(message, snapshot.leaveBalances);

  if (specific) {
    return {
      reply:
        `Your **${specific.displayName}** balance for ${snapshot.year}: **${specific.available}** day(s) available.\n\n` +
        `Used: ${specific.used} · Pending approval: ${specific.pending} · Annual entitlement: ${specific.entitlement}` +
        (specific.carriedForward ? ` · Carried forward: ${specific.carriedForward}` : '') +
        (snapshot.pendingLeaveRequests > 0
          ? `\n\nYou also have **${snapshot.pendingLeaveRequests}** total pending leave request(s) across all types.`
          : ''),
      links: [
        { label: 'Request Leave', href: requestLeaveHref },
        ...(ctx.portalSlug === 'employee'
          ? [{ label: 'Leave History', href: '/employee/leave-history' }]
          : []),
      ],
      suggestions: ['Show all my leave balances', 'Where is leave history?'],
      source: 'rules',
    };
  }

  const summary = snapshot.leaveBalances
    .map((b) => `**${b.displayName}**: ${b.available} day(s) available`)
    .join('\n');

  return {
    reply:
      `Here are **your** leave balances for ${snapshot.year} (only your data):\n\n${summary}` +
      (snapshot.pendingLeaveRequests > 0
        ? `\n\nPending leave requests: **${snapshot.pendingLeaveRequests}**.`
        : '') +
      '\n\nAsk about a specific type, e.g. "How many sick leave days do I have?"',
    links: [{ label: 'Request Leave', href: requestLeaveHref }],
    suggestions: ['How many sick leave days do I have?', 'My casual leave balance'],
    source: 'rules',
  };
}

export function answerTeamDataRefusal(ctx: AssistantContext): AssistantReply {
  const href =
    ctx.portalSlug === 'hr' || ctx.portalSlug === 'admin'
      ? '/hr/leave-balance'
      : ctx.portalSlug === 'manager'
        ? '/manager/team-calendar'
        : '/employee/leave-history';

  return {
    reply:
      'I can only show **your own** leave and attendance data in this chat, not other employees\', for privacy and tenant isolation. To review team balances, use the HR or manager reports in the sidebar.',
    links: [{ label: 'Open team / HR view', href }],
    suggestions: ['What is my sick leave balance?', 'Where do I request leave?'],
    source: 'rules',
  };
}
