'use client';

import { useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ResendInviteApi = 'company' | 'super-admin';

interface ResendInviteButtonProps {
  inviteId: string;
  api: ResendInviteApi;
  className?: string;
  size?: 'sm' | 'md';
}

export function ResendInviteButton({
  inviteId,
  api,
  className,
  size = 'sm' as const,
}: ResendInviteButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const endpoint =
    api === 'company'
      ? `/api/company/invite-user/${inviteId}`
      : `/api/super-admin/user-invites/${inviteId}`;

  async function handleResend() {
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) {
        const detail = [data.error, data.details, data.message].filter(Boolean).join(' — ');
        setError(detail || 'Failed to resend invitation email');
        return;
      }
      setMessage(data.message || 'Invitation email sent.');
    } catch {
      setError('Failed to resend invitation email');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant="outline"
        size={size}
        disabled={loading}
        onClick={handleResend}
        className="inline-flex items-center gap-2"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
        Resend invite
      </Button>
      {message && <p className="mt-1 text-xs text-[var(--success)]">{message}</p>}
      {error && <p className="mt-1 text-xs text-[var(--destructive)]">{error}</p>}
    </div>
  );
}

