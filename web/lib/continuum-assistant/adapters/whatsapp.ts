import type { AssistantReply } from '@/lib/continuum-assistant/types';

export type WhatsAppOutbound =
  | { type: 'text'; text: string }
  | {
      type: 'interactive_buttons';
      text: string;
      buttons: Array<{ id: 'confirm' | 'cancel'; title: string }>;
    };

const WHATSAPP_TEXT_LIMIT = 4096;

export function assistantReplyToWhatsAppMessages(reply: AssistantReply): WhatsAppOutbound[] {
  const messages: WhatsAppOutbound[] = [];
  const text = reply.reply.replace(/\*\*(.+?)\*\*/g, '*$1*');

  for (const chunk of splitText(text, WHATSAPP_TEXT_LIMIT)) {
    messages.push({ type: 'text', text: chunk });
  }

  if (reply.pendingAction) {
    messages.push({
      type: 'interactive_buttons',
      text: reply.pendingAction.summary,
      buttons: [
        { id: 'confirm', title: 'Confirm' },
        { id: 'cancel', title: 'Cancel' },
      ],
    });
  }

  return messages;
}

function splitText(text: string, limit: number): string[] {
  if (text.length <= limit) return [text];

  const chunks: string[] = [];
  let rest = text;
  while (rest.length > limit) {
    const slice = rest.slice(0, limit);
    const breakAt = Math.max(slice.lastIndexOf('\n\n'), slice.lastIndexOf('\n'), slice.lastIndexOf(' '));
    const cut = breakAt > limit * 0.6 ? breakAt : limit;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest.length > 0) chunks.push(rest);
  return chunks;
}
