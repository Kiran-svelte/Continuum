export function detectConstraintExplainIntent(message: string): boolean {
  return (
    /\b(why|can't|cannot|won't|blocked|rejected|denied|fails?|not allowed)\b/i.test(message) &&
    /\b(leave|dates?|take|request|policy|constraint)\b/i.test(message)
  );
}

export function detectSuggestDatesIntent(message: string): boolean {
  return (
    /\b(best|suggest|recommend|optimal|good)\b/i.test(message) &&
    /\b(dates?|days?\s+off|leave|time\s*off)\b/i.test(message)
  ) || /\b(\d+)\s*days?\s+off\b/i.test(message);
}

export function detectApprovalSummaryIntent(message: string): boolean {
  return (
    /\b(summarize|summary|pending|queue|what.*approve|approvals?)\b/i.test(message) &&
    /\b(leave|approval|pending|team)\b/i.test(message)
  );
}

export function detectSetupStatusIntent(message: string): boolean {
  return (
    /\b(setup|getting started|go.?live|readiness|checklist)\b/i.test(message) &&
    /\b(company|payroll|wizard|configure)\b/i.test(message)
  ) || /\bwhat('s| is) left to (setup|configure)\b/i.test(message);
}

export function detectPayrollPreflightIntent(message: string): boolean {
  if (detectPayslipExplainIntent(message)) return false;
  return (
    /\b(payroll|salary run|generate payroll)\b/i.test(message) &&
    /\b(ready|missing|preflight|before|checklist|block)\b/i.test(message)
  );
}

export function detectPayslipExplainIntent(message: string): boolean {
  return (
    /\bpayslip\b/i.test(message) &&
    /\b(what is|explain|meaning|deduction|pf|tds|hra|lop|net pay|gross)\b/i.test(message)
  );
}

export function detectPolicyExplainerIntent(message: string): boolean {
  return (
    /\b(approval chain|level\s*\d|who approves)\b/i.test(message) &&
    /\b(mean|level|chain|workflow|leave|expense)\b/i.test(message)
  );
}

export function detectInviteHelpIntent(message: string): boolean {
  return /\b(invite|invitation|expired|accept invite|join link)\b/i.test(message);
}

export function detectRejectLeaveIntent(message: string): boolean {
  return /\b(reject|deny|decline)\b/i.test(message) && /\b(leave|request)\b/i.test(message);
}

export function detectBulkImportPreviewIntent(message: string): boolean {
  return (
    /\b(bulk|csv|import)\b/i.test(message) &&
    /\b(import|upload|preview|validate|employees?)\b/i.test(message)
  );
}

export function parseDurationDaysFromMessage(message: string): number | null {
  const m = message.match(/\b(\d{1,2})\s*days?\b/i);
  if (m) return Math.min(30, Math.max(1, Number(m[1])));
  return null;
}
