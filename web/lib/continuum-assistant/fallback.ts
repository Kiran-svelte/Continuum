/**
 * Assistant fallback messages when OpenAI or action handlers fail.
 */
export const ASSISTANT_FALLBACK_MESSAGES = {
  generic:
    'I could not complete that request right now. Try again or use the sidebar to open the relevant page.',
  moduleDisabled: (module: string) =>
    `The **${module}** module is not enabled for your company. Contact your admin.`,
  setupIncomplete:
    'Complete company setup before using HR features. Open **Getting Started** to finish onboarding.',
  rateLimit: 'Too many requests. Please wait a moment and try again.',
  payrollRun: "I can't run payroll in chat. Open Continuum: {base}/{portalSlug}/payroll",
  inviteUser: "I can't invite users in chat. Open: {base}/admin/people/invite",
  settings: 'Policy changes must be done in the admin portal: {base}/admin/company-settings',
  genericChat:
    "I can't do that in chat yet. Reply HELP for available actions or open: {base}/{portalSlug}/dashboard",
} as const;

export function fallbackReply(kind: keyof typeof ASSISTANT_FALLBACK_MESSAGES | 'moduleDisabled', module?: string) {
  if (kind === 'moduleDisabled' && module) {
    return ASSISTANT_FALLBACK_MESSAGES.moduleDisabled(module);
  }
  return ASSISTANT_FALLBACK_MESSAGES[kind as keyof typeof ASSISTANT_FALLBACK_MESSAGES] as string;
}
