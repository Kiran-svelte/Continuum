export const DEFAULT_REJECT_REASONS = [
  'Insufficient team coverage for the requested dates. Please choose alternate dates.',
  'Leave balance is insufficient for this request. Consider a shorter duration or LWP with HR approval.',
  'Overlapping critical project deadlines — please reschedule after the delivery window.',
  'Documentation required for this leave type was not provided. Resubmit with supporting details.',
];

export function detectRejectReasonHelpIntent(message: string): boolean {
  return (
    /\b(reject|deny|decline)\b/i.test(message) &&
    /\b(reason|wording|phrase|professional|suggest|help|write)\b/i.test(message)
  );
}

export function parseRejectReasonFromMessage(message: string): string | null {
  const explicit =
    message.match(/\breason\s*:\s*(.+)$/i) ??
    message.match(/\bbecause\s+(.+)$/i) ??
    message.match(/\breject\s+(?:with|using)\s+(.+)$/i);
  if (explicit?.[1]) return explicit[1].trim().slice(0, 500);
  return null;
}

export function formatRejectReasonSuggestions(leaveType?: string): string {
  const typeNote = leaveType ? ` for **${leaveType}** leave` : '';
  const lines = DEFAULT_REJECT_REASONS.map((r, i) => `${i + 1}. ${r}`);
  return (
    `**Suggested professional reject reasons**${typeNote} (edit before confirming):\n\n` +
    `${lines.join('\n\n')}\n\n` +
    'Say **reject leave** then **reason: your text** before **confirm**, or paste your own wording.'
  );
}
