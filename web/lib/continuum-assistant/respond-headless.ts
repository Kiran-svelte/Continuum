/**
 * Headless assistant responder for WhatsApp / Zero UI channel.
 *
 * Unlike the web respond.ts (which takes full AssistantContext with nav hints,
 * personal snapshots, and browser session), this builds a minimal context from
 * an AssistantExecutionContext (from ChannelIdentityLink) and drives the same
 * engine with WhatsApp-appropriate constraints:
 *
 *   - Max 400 tokens (WhatsApp messages should be concise)
 *   - No nav hints (WhatsApp has no sidebar)
 *   - WhatsApp-safe formatting (no markdown tables, headers stripped)
 *   - Same permission + module guard as web
 *   - Same HITL confirm/cancel flow via actionDraft
 *
 * Implements L5-03-PART-C headless respond gate.
 */
import type { AssistantExecutionContext } from '@/lib/services/types';
import type { AssistantContext, AssistantMessage, AssistantReply } from '@/lib/continuum-assistant/types';
import type { AssistantActionDraft } from '@/lib/continuum-assistant/action-types';
import { respondAssistantMessage } from '@/lib/continuum-assistant/respond';
import prisma from '@/lib/prisma';
import { getCompanyModuleState } from '@/lib/core-functions/resolve';

/**
 * Detects if a WhatsApp message is a confirm/cancel button reply.
 * Meta sends button id as the message body for interactive reply buttons.
 */
function detectActionCommand(
  message: string
): 'confirm' | 'cancel' | null {
  const normalized = message.trim().toLowerCase();
  if (normalized === 'confirm' || normalized === 'yes' || normalized === '✓') return 'confirm';
  if (normalized === 'cancel' || normalized === 'no' || normalized === '✗') return 'cancel';
  return null;
}

/**
 * Strips markdown that doesn't render in WhatsApp (tables, headers, links).
 * WhatsApp supports: *bold*, _italic_, ~strikethrough~, ```code```
 */
function sanitizeForWhatsApp(text: string): string {
  return text
    // Remove markdown table rows (|col|col|)
    .replace(/\|[^\n]+\|/g, '')
    // Remove header lines (## Heading)
    .replace(/^#{1,6}\s+/gm, '')
    // Convert **bold** → *bold* (already done in adapter, but belt + suspenders)
    .replace(/\*\*(.+?)\*\*/g, '*$1*')
    // Remove bare URLs in [text](url) format — replace with just the text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Collapse 3+ blank lines to 2
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Builds a minimal AssistantContext for the headless (WhatsApp) path.
 * No nav hints, no personal snapshot pre-loading (done inside respond.ts).
 */
async function buildHeadlessContext(
  ctx: AssistantExecutionContext
): Promise<AssistantContext> {
  const [company, moduleState] = await Promise.all([
    prisma.company.findUnique({
      where: { id: ctx.orgId },
      select: { name: true },
    }),
    getCompanyModuleState(ctx.orgId),
  ]);

  return {
    employeeId: ctx.employeeId,
    companyId: ctx.orgId,
    companyName: company?.name ?? 'your company',
    role: ctx.primaryRole,
    portalSlug: ctx.portalSlug as import('@/lib/navigation/portal-nav').PortalSlug,
    displayName: `${ctx.firstName} ${ctx.lastName}`.trim(),
    enabledModules: moduleState.enabledSlugs,
    permissions: ctx.permissions as import('@/lib/rbac').PermissionCode[],
    navHints: [], // WhatsApp has no sidebar navigation
    personalSnapshot: null, // Loaded lazily inside respond.ts if needed
  };
}

/**
 * Runs a full assistant turn for a WhatsApp inbound message.
 *
 * @param message     - Raw text sent by the user (or button id: 'confirm'/'cancel').
 * @param history     - Conversation history (last 6 messages from conversation store).
 * @param execCtx     - Execution context built from ChannelIdentityLink.
 * @param actionDraft - Current pending HITL draft (from conversation store), if any.
 * @returns AssistantReply with WhatsApp-sanitized text.
 */
export async function respondHeadless(
  message: string,
  history: AssistantMessage[],
  execCtx: AssistantExecutionContext,
  actionDraft: AssistantActionDraft | null
): Promise<AssistantReply> {
  const assistantCtx = await buildHeadlessContext(execCtx);

  const actionCommand = detectActionCommand(message);

  const reply = await respondAssistantMessage(
    message,
    history,
    assistantCtx,
    {
      actionDraft,
      actionCommand,
      // No request — headless path has no Next.js request context
    }
  );

  // Sanitize reply text for WhatsApp rendering
  return {
    ...reply,
    reply: sanitizeForWhatsApp(reply.reply),
  };
}

export { detectActionCommand };
