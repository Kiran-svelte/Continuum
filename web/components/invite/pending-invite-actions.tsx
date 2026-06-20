'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

type InviteApiBase = '/api/company/invite-user' | '/api/super-admin/user-invites';

type Props = {
  inviteId: string;
  editHref?: string;
  apiBase: InviteApiBase;
  onComplete?: () => void;
  className?: string;
};

export function PendingInviteActions({
  inviteId,
  editHref,
  apiBase,
  onComplete,
  className = '',
}: Props) {
  const [resending, setResending] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResend() {
    setError(null);
    setResending(true);
    try {
      const response = await fetch(`${apiBase}/${inviteId}`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || 'Failed to resend invite');
        return;
      }
      onComplete?.();
    } catch {
      setError('Failed to resend invite');
    } finally {
      setResending(false);
    }
  }

  async function handleRevoke() {
    setError(null);
    setRevoking(true);
    try {
      const response = await fetch(`${apiBase}/${inviteId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || 'Failed to revoke invite');
        return;
      }
      setShowRevokeConfirm(false);
      onComplete?.();
    } catch {
      setError('Failed to revoke invite');
    } finally {
      setRevoking(false);
    }
  }

  return (
    <>
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        {editHref && (
          <Link
            href={editHref}
            className="px-3 py-1.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded transition-colors"
          >
            Edit
          </Link>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={resending || revoking}
          onClick={handleResend}
          className="px-3 py-1.5 text-xs font-medium h-auto"
        >
          {resending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Resend'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={resending || revoking}
          onClick={() => setShowRevokeConfirm(true)}
          className="px-3 py-1.5 text-xs font-medium text-[var(--destructive)] hover:bg-[var(--destructive)]/10 h-auto"
        >
          Revoke
        </Button>
      </div>
      {error && <p className="mt-1 text-xs text-[var(--destructive)]">{error}</p>}

      <ConfirmDialog
        isOpen={showRevokeConfirm}
        onClose={() => setShowRevokeConfirm(false)}
        onConfirm={handleRevoke}
        title="Revoke invitation?"
        description="The invite link will stop working. You can send a new invitation later if needed."
        confirmLabel="Revoke Invite"
        variant="danger"
        loading={revoking}
      />
    </>
  );
}
