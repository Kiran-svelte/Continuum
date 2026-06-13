'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bot, GripVertical, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const POS_STORAGE_KEY = 'continuum-assistant-position';
const DRAFT_STORAGE_KEY = 'continuum-assistant-action-draft';
const FAB_SIZE = 56;
const DESKTOP_PANEL_WIDTH = 380;

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  links?: Array<{ label: string; href: string }>;
};

type AssistantPendingAction = {
  kind: string;
  summary: string;
  details: Array<{ label: string; value: string }>;
  confirmLabel: string;
  cancelLabel: string;
};

type AssistantActionDraft = {
  id: string;
  kind: 'request_leave' | 'approve_leave' | 'reject_leave';
  status: 'collecting' | 'awaiting_confirmation';
  payload: Record<string, unknown>;
  createdAt: string;
  expiresAt: string;
};

type AssistantApiResponse = {
  reply: string;
  links: Array<{ label: string; href: string }>;
  suggestions: string[];
  source?: string;
  actionDraft?: AssistantActionDraft | null;
  pendingAction?: AssistantPendingAction | null;
  actionResult?: { executed: boolean; success: boolean; message: string };
  error?: { message: string };
};

function loadPosition(): { x: number; y: number } {
  if (typeof window === 'undefined') {
    return { x: 16, y: 16 };
  }
  try {
    const raw = localStorage.getItem(POS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { x?: number; y?: number };
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        return { x: parsed.x, y: parsed.y };
      }
    }
  } catch {
    /* ignore */
  }
  return { x: 16, y: 16 };
}

function clampPosition(x: number, y: number): { x: number; y: number } {
  const maxX = Math.max(8, window.innerWidth - FAB_SIZE - 8);
  const maxY = Math.max(8, window.innerHeight - FAB_SIZE - 8);
  return {
    x: Math.min(Math.max(8, x), maxX),
    y: Math.min(Math.max(8, y), maxY),
  };
}

function renderMarkdownLite(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-[var(--foreground)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function ContinuumAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 16, y: 16 });
  const [hydrated, setHydrated] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hi! I'm **Continuum Guide**. Ask how-to questions, **your leave balance**, or say **request sick leave** — I'll collect details and only act after you **confirm**.",
    },
  ]);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([
    'Request sick leave for me',
    'How many sick leave days do I have?',
    'How do I view my payslip?',
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionDraft, setActionDraft] = useState<AssistantActionDraft | null>(null);
  const [pendingAction, setPendingAction] = useState<AssistantPendingAction | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(
    null
  );
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPos(loadPosition());
    try {
      const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AssistantActionDraft;
        if (parsed?.expiresAt && new Date(parsed.expiresAt).getTime() > Date.now()) {
          setActionDraft(parsed);
        }
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);

    const mq = window.matchMedia('(max-width: 639px)');
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);

    const onResize = () => setPos((p) => clampPosition(p.x, p.y));
    window.addEventListener('resize', onResize);

    return () => {
      mq.removeEventListener('change', onChange);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open, loading]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    if (isMobile) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, isMobile]);

  const persistPosition = useCallback((next: { x: number; y: number }) => {
    setPos(next);
    try {
      localStorage.setItem(POS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const onDragPointerDown = (e: React.PointerEvent) => {
    if (isMobile || e.button !== 0) return;
    e.preventDefault();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: pos.x,
      originY: pos.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onDragPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    persistPosition(clampPosition(dragRef.current.originX + dx, dragRef.current.originY - dy));
  };

  const onDragPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const callAssistant = async (
    text: string,
    opts?: { actionCommand?: 'confirm' | 'cancel'; displayText?: string }
  ) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError(null);
    setInput('');
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: opts?.displayText ?? trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    const history = [...messages, userMsg]
      .filter((m) => m.id !== 'welcome')
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({
          message: trimmed,
          history,
          actionDraft,
          actionCommand: opts?.actionCommand,
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = (await res.json()) as AssistantApiResponse;

      if (!res.ok) {
        setError(data.error?.message ?? 'Could not reach the assistant. Try again.');
        return;
      }

      const nextDraft = data.actionDraft ?? null;
      setActionDraft(nextDraft);
      setPendingAction(data.pendingAction ?? null);
      try {
        if (nextDraft) sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(nextDraft));
        else sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        /* ignore */
      }

      if (!nextDraft && !data.pendingAction) {
        setPendingAction(null);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          links: data.links,
        },
      ]);
      if (data.suggestions?.length) {
        setSuggestions(data.suggestions);
      }
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = (text: string) => callAssistant(text);

  const confirmPendingAction = () => {
    void callAssistant('confirm', {
      actionCommand: 'confirm',
      displayText: 'Confirm',
    });
  };

  const cancelPendingAction = () => {
    setPendingAction(null);
    setActionDraft(null);
    try {
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    void callAssistant('cancel', { actionCommand: 'cancel', displayText: 'Cancel' });
  };

  if (!hydrated) {
    return null;
  }

  const panelBottom = pos.y + FAB_SIZE + 12;
  const panelRight = pos.x;

  return (
    <>
      {open && (
        <>
          {isMobile && (
            <button
              type="button"
              aria-label="Close chat overlay"
              className="fixed inset-0 z-[9997] bg-black/50 sm:hidden"
              onClick={() => setOpen(false)}
            />
          )}
          <div
            role="dialog"
            aria-label="Continuum Guide"
            aria-modal="true"
            className={cn(
              'fixed z-[9998] flex flex-col overflow-hidden border border-[var(--border)] bg-[var(--card)] shadow-2xl',
              isMobile
                ? 'inset-x-0 bottom-0 left-0 right-0 max-h-[min(92dvh,640px)] w-full rounded-t-2xl rounded-b-none pb-[env(safe-area-inset-bottom)]'
                : 'rounded-2xl max-h-[min(70vh,520px)]'
            )}
            style={
              isMobile
                ? undefined
                : {
                    width: DESKTOP_PANEL_WIDTH,
                    maxWidth: 'min(calc(100vw - 2rem), 380px)',
                    bottom: panelBottom,
                    right: panelRight,
                  }
            }
          >
            <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_95%,var(--primary)_5%)] px-3 py-3 sm:px-4">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Bot className="h-5 w-5 shrink-0 text-[var(--primary)]" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                    Continuum Guide
                  </p>
                  <p className="truncate text-xs text-[var(--muted-foreground)]">
                    Navigation, leave, payroll help
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-9 shrink-0 p-0 touch-manipulation"
                aria-label="Close assistant"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </header>

            <div
              ref={listRef}
              className="readable-copy flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-3 py-3 text-sm leading-relaxed sm:px-4"
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'rounded-xl px-3 py-2 break-words',
                    msg.role === 'user'
                      ? 'ml-4 sm:ml-8 bg-[var(--primary)] text-[var(--primary-foreground)]'
                      : 'mr-2 sm:mr-4 border border-[var(--border)] bg-[var(--muted)]/30 text-[var(--foreground)]'
                  )}
                >
                  <p className="whitespace-pre-wrap">{renderMarkdownLite(msg.content)}</p>
                  {msg.links && msg.links.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {msg.links.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="inline-flex max-w-full truncate rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-xs font-medium text-[var(--primary)] hover:underline touch-manipulation"
                          onClick={() => setOpen(false)}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <p className="text-xs text-[var(--muted-foreground)]">Thinking…</p>
              )}
              {error && (
                <p className="text-xs text-[var(--destructive)]" role="alert">
                  {error}
                </p>
              )}
            </div>

            {pendingAction && (
              <div className="shrink-0 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_92%,var(--primary)_8%)] px-3 py-3 sm:px-4">
                <p className="text-xs font-semibold text-[var(--foreground)]">{pendingAction.summary}</p>
                <ul className="mt-2 space-y-1 text-xs text-[var(--muted-foreground)]">
                  {pendingAction.details.map((d) => (
                    <li key={d.label}>
                      <span className="font-medium text-[var(--foreground)]">{d.label}:</span> {d.value}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="flex-1 touch-manipulation"
                    disabled={loading}
                    onClick={confirmPendingAction}
                  >
                    {pendingAction.confirmLabel}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 touch-manipulation"
                    disabled={loading}
                    onClick={cancelPendingAction}
                  >
                    {pendingAction.cancelLabel}
                  </Button>
                </div>
              </div>
            )}

            {suggestions.length > 0 && (
              <div className="flex shrink-0 gap-1.5 overflow-x-auto border-t border-[var(--border)] px-3 py-2 sm:flex-wrap sm:overflow-visible">
                {suggestions.slice(0, 3).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="shrink-0 max-w-[85vw] truncate rounded-full border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-xs text-[var(--foreground)] hover:bg-[var(--muted)]/40 touch-manipulation sm:max-w-none"
                    onClick={() => sendMessage(s)}
                    disabled={loading}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <form
              className="flex shrink-0 gap-2 border-t border-[var(--border)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
              onSubmit={(e) => {
                e.preventDefault();
                void sendMessage(input);
              }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about leave, payroll…"
                className="min-h-10 min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-base sm:text-sm text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                disabled={loading}
                aria-label="Message Continuum Guide"
              />
              <Button
                type="submit"
                size="sm"
                className="h-10 w-10 shrink-0 p-0 touch-manipulation"
                disabled={loading || !input.trim()}
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </>
      )}

      <div
        className="fixed z-[9999] flex items-center gap-0"
        style={{
          bottom: `max(${pos.y}px, env(safe-area-inset-bottom, 0px))`,
          right: pos.x,
        }}
      >
        {!isMobile && (
          <button
            type="button"
            aria-label="Drag assistant"
            className="hidden h-10 w-6 cursor-grab items-center justify-center rounded-l-full border border-r-0 border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] active:cursor-grabbing sm:flex touch-manipulation"
            onPointerDown={onDragPointerDown}
            onPointerMove={onDragPointerMove}
            onPointerUp={onDragPointerUp}
            onPointerCancel={onDragPointerUp}
          >
            <GripVertical className="h-4 w-4" aria-hidden />
          </button>
        )}
        <button
          type="button"
          aria-label={open ? 'Close Continuum Guide' : 'Open Continuum Guide'}
          aria-expanded={open}
          className="flex h-12 w-12 touch-manipulation items-center justify-center rounded-full border border-[var(--border)] bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg transition-shadow hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] sm:h-14 sm:w-14"
          onClick={() => setOpen((v) => !v)}
        >
          <Bot className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
        </button>
      </div>
    </>
  );
}
