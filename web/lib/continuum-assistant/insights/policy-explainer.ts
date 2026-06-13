import prisma from '@/lib/prisma';
import {
  readApprovalChains,
  type ApprovalChainConfig,
  type WorkflowType,
} from '@/lib/approval-chain-config';

const ROLE_LABELS: Record<string, string> = {
  employee: 'Employee',
  team_lead: 'Team Lead',
  manager: 'Manager',
  director: 'Director',
  hr: 'HR',
  admin: 'Admin',
};

function roleLabel(slug: string): string {
  return ROLE_LABELS[slug] ?? slug.replace(/_/g, ' ');
}

export function parseApprovalChainQuestion(message: string): {
  workflow: WorkflowType;
  level: 1 | 2;
  requesterRole?: string;
} | null {
  const levelMatch = message.match(/\blevel\s*(\d)\b/i);
  const level = levelMatch ? (Number(levelMatch[1]) === 2 ? 2 : 1) : null;
  if (!level && !/\bapproval chain\b/i.test(message) && !/\bwho approves\b/i.test(message)) {
    return null;
  }

  let workflow: WorkflowType = 'leave';
  if (/\bexpense\b/i.test(message)) workflow = 'expense';
  else if (/\btravel\b/i.test(message)) workflow = 'travel';
  else if (/\bpayroll advance\b/i.test(message)) workflow = 'payroll_advance';

  const requesterMatch = message.match(
    /\b(for|when)\s+(an?\s+)?(employee|team lead|team_lead|manager|director|hr|admin)\b/i
  );
  let requesterRole: string | undefined;
  if (requesterMatch) {
    const raw = requesterMatch[3].toLowerCase().replace(/\s+/g, '_');
    requesterRole = raw === 'team' ? 'team_lead' : raw;
  }

  return {
    workflow,
    level: level ?? 1,
    requesterRole,
  };
}

export async function explainApprovalChainForCompany(
  companyId: string,
  workflow: WorkflowType,
  level: 1 | 2,
  requesterRole = 'employee'
): Promise<string> {
  const settings = await prisma.companySettings.findFirst({
    where: { company_id: companyId },
    select: { hr_alerts: true },
  });
  const chains = readApprovalChains(settings?.hr_alerts);
  const chain: ApprovalChainConfig | undefined =
    chains.find((c) => c.workflowType === workflow) ?? chains[0];

  if (!chain) {
    return 'No approval chain is configured yet. Set chains under **HR → Approval Configuration** or complete onboarding.';
  }

  const override =
    chain.roleOverrides?.find((r) => r.requesterRole === requesterRole) ??
    chain.roleOverrides?.[0];

  const l1 = override?.level1Role ?? chain.level1Role;
  const l2 = override?.level2Role ?? chain.level2Role;
  const approverRole = level === 1 ? l1 : l2;
  const autoH = chain.autoApproveAfterHours;

  const lines = [
    `**${workflow} approval — level ${level}** (requester: **${roleLabel(requesterRole)}**):`,
    '',
    `• **Level 1** routes to **${roleLabel(l1)}** (typically the employee's reporting manager).`,
    `• **Level 2** escalates to **${roleLabel(l2)}** if level 1 does not act in time.`,
    '',
    `For your question: **level ${level}** means **${roleLabel(approverRole)}** is the approver role at that step (resolved to a specific person via \`manager_id\` / hierarchy, never self-approve).`,
  ];

  if (autoH > 0) {
    lines.push(
      '',
      `If level 1 is idle for **${autoH}h**, the request can auto-escalate per company SLA settings.`
    );
  }

  lines.push('', '_Per-employee **Approval Hierarchy** rows override this matrix when present._');
  return lines.join('\n');
}
