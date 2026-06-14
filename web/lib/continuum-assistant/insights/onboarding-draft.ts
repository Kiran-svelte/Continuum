import type { AssistantContext } from '@/lib/continuum-assistant/types';

export function detectOnboardingDraftIntent(message: string): boolean {
  return (
    (/\b(invite|invitation)\b/i.test(message) && /\b(email|wording|message|template|draft)\b/i.test(message)) ||
    /\b(suggest|help me write).*(invite|welcome email)/i.test(message)
  );
}

export function buildInviteEmailDraft(ctx: AssistantContext, companyName?: string): string {
  const org = companyName ?? 'your organization';
  return (
    `**Suggested invite email** (copy and edit before sending — you publish from **People → Invite**):\n\n` +
    `---\n` +
    `Subject: You're invited to Continuum — ${org}\n\n` +
    `Hi {{first_name}},\n\n` +
    `Welcome to **${org}**. Use the link below to activate your account and set your password (expires in 7 days):\n\n` +
    `{{invite_link}}\n\n` +
    `Your role: **{{role}}**. After sign-in, complete your profile and review leave policies in the employee portal.\n\n` +
    `Questions? Reply to your HR contact.\n\n` +
    `— ${org} HR\n` +
    `---\n\n` +
    '_Continuum does not send this automatically from chat — paste into your invite flow or email client._'
  );
}

export function buildLeaveTemplateSuggestions(): string {
  return (
    '**Starter leave templates** (enable under Company Settings / onboarding):\n\n' +
    '• **Sick** — 12 days/year, medical proof after 2 consecutive days\n' +
    '• **Casual** — 8 days/year, 1-day advance notice\n' +
    '• **Earned / Annual** — accrual monthly, 7-day advance for >3 days\n\n' +
    'Adjust entitlements to match your policy before go-live.'
  );
}
