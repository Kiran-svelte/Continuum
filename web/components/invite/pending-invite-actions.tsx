'use client';

import { useCallback, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ResendButton } from '@/components/ui/resend-button';
import { reportApiActionOutcome } from '@/lib/client/report-action-outcome';
import { fetchWithTimeout, mapFetchErrorMessage } from '@/lib/fetch-with-timeout';
import { cn } from '@/lib/utils';

const REQUEST_TIMEOUT_MS = 15_000;

type PendingInviteBackend = 'employee-invite' | 'company-user-invite';

class ReportedActionError extends Error {}

interface PendingInviteActionsProps {
  inviteId: string;
  email: string;
  backend: PendingInviteBackend;
  onChanged?: () => Promise<void> | void;
  className?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function hasActionOutcome(payload: unknown): boolean {
  return isRecord(payload) && isRecord(payload.actionOutcome);
}

function apiMessage(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback;
  const error = payload.error;
  const details = payload.details;
  const message = payload.message;

  if (typeof error === 'string' && error.trim()) {
    return typeof details === 'string' && details.trim()
      ? `${error}: ${details}`
      : error;
  }

  if (typeof message === 'string' && message.trim()) return message;
  return fallback;
}

export function PendingInviteActions({
  inviteId,
  email,
  backend,
  onChanged,
  className,
}: PendingInviteActionsProps) {
  const [revoking, setRevoking] = useState(false);

  const refresh = useCallback(async () => {
    if (onChanged) await onChanged();
  }, [onChanged]);

  const handleResend = useCallback(async () => {
    try {
      const response =
        backend === 'employee-invite'
          ? await fetchWithTimeout(
              '/api/email/resend',
              {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'invite', targetId: inviteId }),
              },
              REQUEST_TIMEOUT_MS
            )
          : await fetchWithTimeout(
              `/api/company/invite-user/${inviteId}`,
              {
                method: 'POST',
                credentials: 'include',
              },
              REQUEST_TIMEOUT_MS
            );

      const payload = await response.json().catch(() => ({}));
      reportApiActionOutcome(payload);

      if (!response.ok) {
        const message = apiMessage(payload, `Could not resend invite to ${email}.`);
        if (!hasActionOutcome(payload)) {
          toast.error(message, {
            description: 'Check mail configuration, then try again.',
            duration: 8000,
          });
        }
        throw new ReportedActionError(message);
      }

      if (!hasActionOutcome(payload)) {
        toast.success(`Invite resent to ${email}`);
      }

      await refresh();
    } catch (error) {
      if (error instanceof ReportedActionError) throw error;
      const message = mapFetchErrorMessage(error, `Could not resend invite to ${email}.`);
      toast.error(message, {
        description: 'Check your connection, then try again.',
        duration: 8000,
      });
      throw new Error(message);
    }
  }, [backend, email, inviteId, refresh]);

  const handleRevoke = useCallback(async () => {
    if (revoking) return;
    if (
      !window.confirm(
        `Revoke invite for ${email}? They will no longer be able to use this invite link.`
      )
    ) {
      return;
    }

    setRevoking(true);
    try {
      const response =
        backend === 'employee-invite'
          ? await fetchWithTimeout(
              `/api/hr/invites/${inviteId}/revoke`,
              {
                method: 'POST',
                credentials: 'include',
              },
              REQUEST_TIMEOUT_MS
            )
          : await fetchWithTimeout(
              `/api/company/invite-user/${inviteId}`,
              {
                method: 'DELETE',
                credentials: 'include',
              },
              REQUEST_TIMEOUT_MS
            );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(apiMessage(payload, `Could not revoke invite for ${email}.`));
      }

      toast.success(`Invite revoked for ${email}`);
      await refresh();
    } catch (error) {
      toast.error(mapFetchErrorMessage(error, `Could not revoke invite for ${email}.`), {
        description: 'The invite is still active unless the list refresh shows it removed.',
        duration: 8000,
      });
    } finally {
      setRevoking(false);
    }
  }, [backend, email, inviteId, refresh, revoking]);

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <ResendButton
        onResend={handleResend}
        label="Resend"
        sentLabel="Sent"
        cooldownSeconds={60}
        size="sm"
        variant="ghost"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={revoking}
        className="text-[var(--danger)] hover:bg-[var(--danger)]/10"
        aria-label={`Revoke invite for ${email}`}
        onClick={handleRevoke}
      >
        {revoking ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        )}
      </Button>
    </div>
  );
}
