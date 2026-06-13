import type { AssistantContext, AssistantReply } from '@/lib/continuum-assistant/types';
import { hasPermission } from '@/lib/rbac';
import { evaluateLeaveConstraintsForRequest } from '@/lib/leave-constraint-evaluator';
import { suggestLeaveDates } from '@/lib/ai-engine/smart-leave';
import { isLeaveAiPredictionEnabled, getCompanyModuleState } from '@/lib/core-functions/resolve';
import {
  formatConstraintPlainEnglish,
} from '@/lib/continuum-assistant/insights/constraint-plain-english';
import {
  formatApprovalQueueSummary,
  loadApprovalQueueSummary,
} from '@/lib/continuum-assistant/insights/approval-queue';
import {
  formatPayrollPreflight,
  loadPayrollPreflight,
} from '@/lib/continuum-assistant/insights/payroll-preflight';
import {
  formatSetupCopilot,
  loadSetupSnapshot,
} from '@/lib/continuum-assistant/insights/setup-snapshot';
import {
  formatEmployeeFirstDay,
  loadEmployeeFirstDaySteps,
} from '@/lib/continuum-assistant/insights/employee-onboarding';
import {
  detectApprovalSummaryIntent,
  detectBulkImportPreviewIntent,
  detectConstraintExplainIntent,
  detectInviteHelpIntent,
  detectPayrollPreflightIntent,
  detectSetupStatusIntent,
  detectSuggestDatesIntent,
  parseDurationDaysFromMessage,
} from '@/lib/continuum-assistant/insights/intent-detect';
import {
  formatBulkImportPreviewForChat,
  validateBulkImportCsv,
} from '@/lib/hr/bulk-import-preview';
import {
  inferLeaveTypeCode,
  loadCompanyLeaveTypeCodes,
  parseNaturalDateRange,
} from '@/lib/continuum-assistant/actions/parse-leave-input';
import type { RequestLeavePayload } from '@/lib/continuum-assistant/action-types';
import prisma from '@/lib/prisma';
import {
  explainApprovalChainForCompany,
  parseApprovalChainQuestion,
} from '@/lib/continuum-assistant/insights/policy-explainer';
import {
  explainPayslipLineForEmployee,
  parsePayslipLineKeyword,
} from '@/lib/continuum-assistant/insights/payslip-explain';
import {
  detectRejectReasonHelpIntent,
  formatRejectReasonSuggestions,
} from '@/lib/continuum-assistant/insights/reject-reason-helper';
import {
  buildInviteEmailDraft,
  buildLeaveTemplateSuggestions,
  detectOnboardingDraftIntent,
} from '@/lib/continuum-assistant/insights/onboarding-draft';

export async function handlePolicyExplainer(
  message: string,
  ctx: AssistantContext
): Promise<AssistantReply | null> {
  const parsed = parseApprovalChainQuestion(message);
  if (!parsed) return null;
  if (ctx.role !== 'admin' && ctx.role !== 'hr') {
    return {
      reply:
        'Approval chain configuration is managed by **HR/Admin**. Ask: "Who approves my leave?" for your own requests.',
      links: [{ label: 'Leave history', href: `/${ctx.portalSlug}/leave-history` }],
      suggestions: [],
      source: 'rules',
    };
  }

  const reply = await explainApprovalChainForCompany(
    ctx.companyId,
    parsed.workflow,
    parsed.level,
    parsed.requesterRole ?? 'employee'
  );
  return {
    reply,
    links: [{ label: 'Approval configuration', href: '/hr/approval-config' }],
    suggestions: ['What does approval chain level 2 mean for leave?'],
    source: 'rules',
  };
}

export async function handlePayslipExplain(
  message: string,
  ctx: AssistantContext
): Promise<AssistantReply | null> {
  const keyword = parsePayslipLineKeyword(message);
  if (!keyword) return null;

  const reply = await explainPayslipLineForEmployee(ctx.employeeId, ctx.companyId, keyword);
  return {
    reply,
    links: [{ label: 'Payslips', href: '/employee/payslips' }],
    suggestions: ['What is PF on my payslip?', 'What is TDS on my payslip?'],
    source: 'rules',
  };
}

export async function handleRejectReasonHelp(
  message: string,
  ctx: AssistantContext
): Promise<AssistantReply | null> {
  if (!detectRejectReasonHelpIntent(message)) return null;
  if (
    !hasPermission(ctx.permissions, 'leave.approve_team') &&
    !hasPermission(ctx.permissions, 'leave.approve_any')
  ) {
    return {
      reply: 'Reject reason suggestions are for managers/HR who approve leave.',
      links: [],
      suggestions: [],
      source: 'rules',
    };
  }

  return {
    reply: formatRejectReasonSuggestions(),
    links: [{ label: 'Approvals', href: ctx.portalSlug === 'manager' ? '/manager/approvals' : `/${ctx.portalSlug}/leave-requests` }],
    suggestions: ['Reject leave', 'Summarize my pending approvals'],
    source: 'rules',
  };
}

export async function handleOnboardingDraft(
  message: string,
  ctx: AssistantContext
): Promise<AssistantReply | null> {
  if (!detectOnboardingDraftIntent(message)) return null;
  if (ctx.role !== 'admin' && ctx.role !== 'hr') {
    return {
      reply: 'Invite email drafts are for **HR/Admin**. Try **first day** checklist as an employee.',
      links: [],
      suggestions: ['What do I do on my first day?'],
      source: 'rules',
    };
  }

  const company = await prisma.company.findUnique({
    where: { id: ctx.companyId },
    select: { name: true },
  });

  const parts = [buildInviteEmailDraft(ctx, company?.name)];
  if (/\bleave template/i.test(message)) {
    parts.push('\n\n' + buildLeaveTemplateSuggestions());
  }

  return {
    reply: parts.join('\n'),
    links: [
      { label: 'People', href: '/admin/people' },
      { label: 'Getting Started', href: '/admin/getting-started' },
    ],
    suggestions: ['Setup status for my company'],
    source: 'rules',
  };
}

export async function handleConstraintExplain(
  message: string,
  ctx: AssistantContext,
  draftPayload?: RequestLeavePayload
): Promise<AssistantReply | null> {
  if (!detectConstraintExplainIntent(message)) return null;

  let leaveType = draftPayload?.leave_type;
  let startDate = draftPayload?.start_date;
  let endDate = draftPayload?.end_date;

  const codes = await loadCompanyLeaveTypeCodes(ctx.companyId);
  leaveType = leaveType ?? inferLeaveTypeCode(message, codes) ?? undefined;
  const dates = parseNaturalDateRange(message);
  if (dates) {
    startDate = dates.start_date;
    endDate = dates.end_date;
  }

  if (!leaveType || !startDate || !endDate) {
    return {
      reply:
        'To explain **why those dates work or not**, tell me:\n\n' +
        '• **Leave type** (e.g. sick, casual)\n' +
        '• **Dates** (e.g. "20–22 May")\n\n' +
        'Or start **request leave** and I will use the dates you provide.',
      links: [{ label: 'Request Leave', href: `/${ctx.portalSlug}/request-leave` }],
      suggestions: ['Request sick leave on 25 May', 'Why can\'t I take casual leave next week?'],
      source: 'rules',
    };
  }

  const balance = await prisma.leaveBalance.findUnique({
    where: {
      emp_id_leave_type_year: {
        emp_id: ctx.employeeId,
        leave_type: leaveType.toUpperCase(),
        year: new Date(`${startDate}T00:00:00Z`).getUTCFullYear(),
      },
    },
  });

  const evaluation = await evaluateLeaveConstraintsForRequest({
    employeeId: ctx.employeeId,
    companyId: ctx.companyId,
    leaveType: leaveType.toUpperCase(),
    startDate,
    endDate,
    isHalfDay: false,
    balance: balance
      ? {
          annual_entitlement: balance.annual_entitlement,
          carried_forward: balance.carried_forward,
          used_days: balance.used_days,
          pending_days: balance.pending_days,
          encashed_days: balance.encashed_days,
          remaining: balance.remaining,
        }
      : null,
  });

  return {
    reply: formatConstraintPlainEnglish(evaluation, {
      leaveType: leaveType.toUpperCase(),
      startDate,
      endDate,
    }),
    links: [{ label: 'Request Leave', href: `/${ctx.portalSlug}/request-leave` }],
    suggestions: ['Request sick leave for me', 'Best dates for 3 days off'],
    source: 'rules',
  };
}

export async function handleSuggestDates(
  message: string,
  ctx: AssistantContext
): Promise<AssistantReply | null> {
  if (!detectSuggestDatesIntent(message)) return null;

  const moduleState = await getCompanyModuleState(ctx.companyId);
  if (!isLeaveAiPredictionEnabled(moduleState)) {
    return {
      reply:
        'Smart date suggestions are disabled for your company. Pick dates manually on **Request Leave**, or ask HR to enable leave AI predictions.',
      links: [{ label: 'Request Leave', href: `/${ctx.portalSlug}/request-leave` }],
      suggestions: [],
      source: 'rules',
    };
  }

  const duration = parseDurationDaysFromMessage(message) ?? 3;
  const suggestions = await suggestLeaveDates(ctx.employeeId, ctx.companyId, duration);

  if (suggestions.length === 0) {
    return {
      reply: `No low-risk **${duration}-day** windows found in the next 30 days. Try shorter leave or different dates on **Request Leave**.`,
      links: [{ label: 'Request Leave', href: `/${ctx.portalSlug}/request-leave` }],
      suggestions: [],
      source: 'rules',
    };
  }

  const lines = suggestions.map(
    (s, i) =>
      `${i + 1}. **${s.startDate}** → **${s.endDate}** (${s.durationDays}d) — ${s.riskLevel} risk, ~${Math.round(s.teamCoveragePercent)}% team coverage\n   ${s.reason}`
  );

  return {
    reply:
      `**Suggested ${duration}-day leave windows** (team coverage + policy):\n\n${lines.join('\n\n')}\n\n` +
      'Say **request sick leave on [date]** to start a confirmed submit flow.',
    links: [{ label: 'Request Leave', href: `/${ctx.portalSlug}/request-leave` }],
    suggestions: suggestions[0]
      ? [`Request leave ${suggestions[0].startDate} to ${suggestions[0].endDate}`]
      : [],
    source: 'rules',
  };
}

export async function handleApprovalSummary(
  message: string,
  ctx: AssistantContext
): Promise<AssistantReply | null> {
  if (!detectApprovalSummaryIntent(message)) return null;

  const summary = await loadApprovalQueueSummary(ctx);
  if (!summary) {
    return {
      reply: 'Approval summaries are for managers/HR with **leave.approve_team** permission.',
      links: [],
      suggestions: ['Where do I request leave?'],
      source: 'rules',
    };
  }

  const href =
    ctx.portalSlug === 'manager' ? '/manager/approvals' : `/${ctx.portalSlug}/leave-requests`;

  return {
    reply: formatApprovalQueueSummary(summary, ctx),
    links: [{ label: 'Open Approvals', href }],
    suggestions: ['Approve leave', 'Reject leave'],
    source: 'rules',
  };
}

export async function handleSetupStatus(
  message: string,
  ctx: AssistantContext
): Promise<AssistantReply | null> {
  if (!detectSetupStatusIntent(message)) return null;
  if (ctx.role !== 'admin' && ctx.role !== 'hr') {
    return {
      reply: 'Company setup status is available to **admin** and **HR**. Try **Getting Started** in your portal menu.',
      links: [],
      suggestions: [],
      source: 'rules',
    };
  }

  const snap = await loadSetupSnapshot(ctx.companyId);
  return {
    reply: formatSetupCopilot(snap, ctx),
    links: [
      { label: 'Getting Started', href: '/admin/getting-started' },
      { label: 'Salary Structures', href: '/hr/salary-structures' },
    ],
    suggestions: ['Payroll pre-flight check'],
    source: 'rules',
  };
}

export async function handlePayrollPreflight(
  message: string,
  ctx: AssistantContext
): Promise<AssistantReply | null> {
  if (!detectPayrollPreflightIntent(message)) return null;

  const report = await loadPayrollPreflight(ctx);
  if (!report) {
    return {
      reply: 'Payroll pre-flight is for **HR/admin** with payroll permissions.',
      links: [],
      suggestions: [],
      source: 'rules',
    };
  }

  return {
    reply: formatPayrollPreflight(report),
    links: [
      { label: 'Payroll', href: '/hr/payroll' },
      { label: 'Salary Structures', href: '/hr/salary-structures' },
    ],
    suggestions: ['Setup status for my company'],
    source: 'rules',
  };
}

export async function handleInviteHelp(
  message: string,
  ctx: AssistantContext
): Promise<AssistantReply | null> {
  if (!detectInviteHelpIntent(message)) return null;

  const employee = await prisma.employee.findUnique({
    where: { id: ctx.employeeId },
    select: { email: true, status: true },
  });

  const email = employee?.email;
  const [userInvite, employeeInvite] = email
    ? await Promise.all([
        prisma.userInvite.findFirst({
          where: {
            email: { equals: email, mode: 'insensitive' },
            company_id: ctx.companyId,
          },
          orderBy: { created_at: 'desc' },
        }),
        prisma.employeeInvite.findFirst({
          where: {
            email: { equals: email, mode: 'insensitive' },
            company_id: ctx.companyId,
          },
          orderBy: { created_at: 'desc' },
        }),
      ])
    : [null, null];

  const invite = userInvite;
  const legacyInvite = employeeInvite;

  if (!invite && !legacyInvite) {
    return {
      reply:
        'If you cannot log in:\n\n' +
        '• Use **Forgot password** on the sign-in page.\n' +
        '• Ask HR to **resend your invite** from Admin → People.\n' +
        '• Open the invite link in the same browser (not expired).',
      links: [{ label: 'Sign in', href: '/sign-in' }],
      suggestions: ['What do I do on my first day?'],
      source: 'rules',
    };
  }

  if (legacyInvite && !invite) {
    const exp = legacyInvite.expires_at.toISOString().split('T')[0];
    if (legacyInvite.used_at) {
      return {
        reply: 'Your employee invite was **already used**. Use **Forgot password** if you cannot sign in.',
        links: [{ label: 'Forgot password', href: '/forgot-password' }],
        suggestions: ['What do I do on my first day?'],
        source: 'rules',
      };
    }
    if (legacyInvite.expires_at < new Date()) {
      return {
        reply: `Your invite **expired** on **${exp}**. Ask HR to **resend** to **${legacyInvite.email}**.`,
        links: [{ label: 'Sign in', href: '/sign-in' }],
        suggestions: ['What do I do on my first day?'],
        source: 'rules',
      };
    }
    return {
      reply: `Invite for **${legacyInvite.email}** is **active** (expires **${exp}**). Open the email link to set your password.`,
      links: [{ label: 'Sign in', href: '/sign-in' }],
      suggestions: ['What do I do on my first day?'],
      source: 'rules',
    };
  }

  const status = invite!.status;
  const exp = invite!.expires_at?.toISOString().split('T')[0] ?? 'unknown';
  if (status === 'pending' && invite!.expires_at && invite!.expires_at < new Date()) {
    return {
      reply: `Your invite **expired** on **${exp}**. Ask HR to **resend** a new invite to **${invite!.email}**.`,
      links: [{ label: 'Sign in', href: '/sign-in' }],
      suggestions: ['What do I do on my first day?'],
      source: 'rules',
    };
  }

  if (status === 'revoked') {
    return {
      reply: 'This invite was **revoked**. Contact HR to issue a new invitation.',
      links: [{ label: 'Sign in', href: '/sign-in' }],
      suggestions: [],
      source: 'rules',
    };
  }

  if (status === 'accepted') {
    return {
      reply: 'Your invite was **already accepted**. Use **Forgot password** if you cannot sign in.',
      links: [{ label: 'Forgot password', href: '/forgot-password' }],
      suggestions: ['What do I do on my first day?'],
      source: 'rules',
    };
  }

  return {
    reply:
      `Invite for **${invite!.email}** is **${status}** (expires **${exp}**).\n\n` +
      'Open the link in the email, set your password, then sign in.',
    links: [{ label: 'Sign in', href: '/sign-in' }],
    suggestions: ['What do I do on my first day?'],
    source: 'rules',
  };
}

export async function handleEmployeeFirstDay(
  message: string,
  ctx: AssistantContext
): Promise<AssistantReply | null> {
  if (!/\b(first day|what do i do|getting started|new here|just joined)\b/i.test(message)) {
    return null;
  }

  const state = await loadEmployeeFirstDaySteps(ctx.employeeId, ctx.companyId);
  return {
    reply: formatEmployeeFirstDay(state, ctx),
    links: [
      { label: 'Request Leave', href: `/${ctx.portalSlug}/request-leave` },
      { label: 'My profile', href: `/${ctx.portalSlug}/settings` },
    ],
    suggestions: ['How many sick leave days do I have?'],
    source: 'rules',
  };
}

export async function handleBulkImportGuide(
  message: string,
  ctx: AssistantContext
): Promise<AssistantReply | null> {
  if (!detectBulkImportPreviewIntent(message)) return null;
  if (ctx.role !== 'hr' && ctx.role !== 'admin') {
    return {
      reply: 'Bulk employee import is handled by **HR** on **Bulk Import**. Upload your CSV there for automatic pre-flight validation.',
      links: [],
      suggestions: [],
      source: 'rules',
    };
  }

  if (message.includes(',') && message.split('\n').length >= 2) {
    const preview = validateBulkImportCsv(message);
    return {
      reply: formatBulkImportPreviewForChat(preview),
      links: [{ label: 'HR Bulk Import', href: '/hr/bulk-import' }],
      suggestions: [],
      source: 'rules',
    };
  }

  return {
    reply:
      'Upload your CSV on **HR → Bulk Import**. The page runs a **pre-flight check** (required columns, duplicate emails, invalid roles) before any employee is created.\n\n' +
      'Required headers: **first_name, last_name, email**. Optional: role, department, designation, manager_email, phone.\n\n' +
      'You can also paste a small CSV sample here and I will validate it.',
    links: [{ label: 'Bulk Import', href: '/hr/bulk-import' }],
    suggestions: [],
    source: 'rules',
  };
}

export async function processInsightIntents(
  message: string,
  ctx: AssistantContext,
  draftPayload?: RequestLeavePayload
): Promise<AssistantReply | null> {
  const handlers = [
    () => handlePolicyExplainer(message, ctx),
    () => handlePayslipExplain(message, ctx),
    () => handleRejectReasonHelp(message, ctx),
    () => handleOnboardingDraft(message, ctx),
    () => handleConstraintExplain(message, ctx, draftPayload),
    () => handleSuggestDates(message, ctx),
    () => handleApprovalSummary(message, ctx),
    () => handleSetupStatus(message, ctx),
    () => handlePayrollPreflight(message, ctx),
    () => handleBulkImportGuide(message, ctx),
    () => handleInviteHelp(message, ctx),
    () => handleEmployeeFirstDay(message, ctx),
  ];

  for (const run of handlers) {
    const reply = await run();
    if (reply) return reply;
  }
  return null;
}
