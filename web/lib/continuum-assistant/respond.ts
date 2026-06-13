import type { NextRequest } from 'next/server';
import type { AssistantContext, AssistantMessage, AssistantReply } from '@/lib/continuum-assistant/types';
import { processAssistantActions } from '@/lib/continuum-assistant/actions/orchestrator';
import type { AssistantActionDraft } from '@/lib/continuum-assistant/action-types';
import { answerWithKnowledge, getDefaultSuggestions } from '@/lib/continuum-assistant/knowledge';
import {
  answerPersonalLeaveQuery,
  answerTeamDataRefusal,
  formatPersonalSnapshotForPrompt,
  isPersonalDataQuery,
  isTeamDataQuery,
  loadAssistantPersonalSnapshot,
} from '@/lib/continuum-assistant/personal-snapshot';

const ASSISTANT_MODEL = 'gpt-4o-mini';
const MAX_HISTORY = 6;

function buildSystemPrompt(ctx: AssistantContext): string {
  const navList = ctx.navHints
    .slice(0, 40)
    .map((n) => `- ${n.label}: ${n.href}`)
    .join('\n');

  return `You are Continuum Guide, a helpful in-app assistant for ${ctx.companyName}.
The user's name is ${ctx.displayName}. Role: ${ctx.role}. Portal: ${ctx.portalSlug}.
Enabled modules: ${ctx.enabledModules.join(', ') || 'default'}.

Rules:
- Answer only about using Continuum HR (navigation, leave, payroll, attendance, setup, approvals).
- Be concise (2-4 short paragraphs max). Use **bold** for UI labels.
- Never invent URLs; only suggest links from the menu list below.
- Do not expose other employees' private data, salaries, or credentials.
- When personal data is provided below, use ONLY those numbers for this user — never guess or use other people's data.
- For leave requests: tell the user they can say **"request sick leave"** (or any leave type) and Continuum will collect dates/reason, then ask them to **confirm** before submitting. Do NOT say you are "unable" to help with leave requests.
- For approvals: managers/HR can say **"approve leave"** and confirm before the system acts. Never claim an action completed without user confirmation.
- If unsure, suggest they contact HR or their admin.
${ctx.personalSnapshot ? `\n\n${formatPersonalSnapshotForPrompt(ctx.personalSnapshot)}` : ''}

Sidebar pages available to this user:
${navList || '(none listed)'}`;
}

async function requestOpenAIChatCompletion(
  apiKey: string,
  body: {
    model: string;
    temperature: number;
    max_tokens: number;
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  }
): Promise<string | null> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };

  return data.choices?.[0]?.message?.content?.trim() || null;
}

async function answerWithOpenAI(
  message: string,
  history: AssistantMessage[],
  ctx: AssistantContext,
  ruleFallback: AssistantReply
): Promise<AssistantReply> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return ruleFallback;
  }

  try {
    const recent = history.slice(-MAX_HISTORY);
    const text = await requestOpenAIChatCompletion(apiKey, {
      model: ASSISTANT_MODEL,
      temperature: 0.35,
      max_tokens: 500,
      messages: [
        { role: 'system', content: buildSystemPrompt(ctx) },
        ...recent.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: message },
      ],
    });
    if (!text) {
      return ruleFallback;
    }

    const links = ruleFallback.links.length > 0 ? ruleFallback.links : [];
    return {
      reply: text,
      links,
      suggestions: ruleFallback.suggestions.length
        ? ruleFallback.suggestions
        : getDefaultSuggestions(ctx.role),
      source: ruleFallback.source === 'rules' ? 'hybrid' : 'openai',
    };
  } catch {
    return ruleFallback;
  }
}

export type RespondAssistantOptions = {
  request?: NextRequest;
  actionDraft?: AssistantActionDraft | null;
  actionCommand?: 'confirm' | 'cancel' | null;
};

export async function respondAssistantMessage(
  message: string,
  history: AssistantMessage[],
  ctx: AssistantContext,
  options: RespondAssistantOptions
): Promise<AssistantReply> {
  const trimmed = message.trim();

  if (options.actionCommand === 'confirm' || options.actionCommand === 'cancel') {
    const cmdReply = await processAssistantActions({
      message,
      actionCommand: options.actionCommand,
      actionDraft: options.actionDraft ?? null,
      ctx,
      request: options.request,
    });
    if (cmdReply) return cmdReply;
    return {
      reply:
        'No pending action to confirm. Say **request annual leave from 5 June for 5 days** or **approve leave for [name]**, then use **Confirm** when I show the summary.',
      links: [],
      suggestions: ['Request sick leave tomorrow', 'Summarize my pending approvals'],
      source: 'rules',
      actionDraft: null,
    };
  }

  const { isConfirmMessage, shouldAbandonLeaveDraft } = await import(
    '@/lib/continuum-assistant/actions/parse-leave-input'
  );

  if (isConfirmMessage(trimmed) && !options.actionDraft) {
    return {
      reply:
        'There is nothing waiting for confirmation. Start a new **request leave** or **approve/reject leave for [employee name]** flow first.',
      links: [],
      suggestions: ['Request annual leave for 5 days from 5 June', 'Approve leave for Riya'],
      source: 'rules',
      actionDraft: null,
    };
  }

  if (isTeamDataQuery(message)) {
    return answerTeamDataRefusal(ctx);
  }

  let enrichedCtx = ctx;
  if (isPersonalDataQuery(message)) {
    const snapshot = await loadAssistantPersonalSnapshot(ctx.employeeId, ctx.companyId);
    enrichedCtx = { ...ctx, personalSnapshot: snapshot };
    if (snapshot) {
      const personalAnswer = answerPersonalLeaveQuery(message, snapshot, enrichedCtx);
      if (personalAnswer) {
        return personalAnswer;
      }
    }
  }

  const effectiveDraft =
    options.actionDraft && shouldAbandonLeaveDraft(trimmed) ? null : options.actionDraft ?? null;

  const actionReply = await processAssistantActions({
    message,
    actionCommand: null,
    actionDraft: effectiveDraft,
    ctx,
    request: options.request,
  });
  if (actionReply) {
    return actionReply;
  }

  const ruleAnswer =
    answerWithKnowledge(message, enrichedCtx) ?? {
      reply:
        'I can help with leave requests, balances, approvals, payslips, payroll basics, company setup, and finding pages in the sidebar. Try **"request sick leave"** (I will ask for details, then you confirm before submit) or use **Ctrl+K** to search the menu.',
      links: [],
      suggestions: getDefaultSuggestions(enrichedCtx.role),
      source: 'rules' as const,
    };

  const hybrid = await answerWithOpenAI(message, history, enrichedCtx, ruleAnswer);
  if (/\b(has been approved|has been rejected|i've approved|i have approved|submitted your leave)\b/i.test(hybrid.reply)) {
    return {
      ...ruleAnswer,
      reply:
        `${ruleAnswer.reply}\n\n_I only change leave status after you **Confirm** on a summary I show — I cannot approve from chat text alone._`,
      source: 'rules',
    };
  }

  return hybrid;
}
