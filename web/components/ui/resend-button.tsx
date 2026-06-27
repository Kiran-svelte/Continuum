'use client';

/**
 * ResendButton — Cooldown-aware resend/retry button.
 *
 * Shows a countdown timer after each click to prevent spam.
 * Used for: invite resend, OTP resend, password reset resend,
 *            payslip notification resend, welcome email resend.
 *
 * Usage:
 *   <ResendButton onResend={handleResend} label="Resend invite" />
 *   <ResendButton onResend={handleResend} cooldownSeconds={30} label="Resend OTP" />
 */
import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ResendButtonProps {
  /** Async function called when user clicks resend. Should return void or throw. */
  onResend: () => Promise<void>;
  /** Button label (default: "Resend") */
  label?: string;
  /** Label shown after successful resend (default: "Sent!") */
  sentLabel?: string;
  /** Cooldown in seconds after each resend (default: 60) */
  cooldownSeconds?: number;
  /** Additional CSS classes */
  className?: string;
  /** Button size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Button visual variant */
  variant?: 'primary' | 'ghost' | 'outline';
  /** Start in cooldown state (e.g. email was just sent on page load) */
  initialCooldown?: boolean;
}

export function ResendButton({
  onResend,
  label = 'Resend',
  sentLabel = 'Sent!',
  cooldownSeconds = 60,
  className,
  size = 'sm',
  variant = 'ghost',
  initialCooldown = false,
}: ResendButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'sent' | 'cooldown' | 'error'>(
    initialCooldown ? 'cooldown' : 'idle'
  );
  const [secondsLeft, setSecondsLeft] = useState(initialCooldown ? cooldownSeconds : 0);

  // Start countdown
  useEffect(() => {
    if (state !== 'cooldown') return;

    setSecondsLeft(cooldownSeconds);
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          setState('idle');
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state, cooldownSeconds]);

  const handleClick = useCallback(async () => {
    if (state !== 'idle' && state !== 'error') return;

    setState('loading');
    try {
      await onResend();
      setState('sent');
      // Show "Sent!" for 2 seconds, then start cooldown
      setTimeout(() => setState('cooldown'), 2000);
    } catch {
      setState('error');
    }
  }, [state, onResend]);

  const isDisabled = state === 'loading' || state === 'sent' || state === 'cooldown';

  return (
    <Button
      type="button"
      variant={variant}
      size={size === 'md' ? undefined : size}
      onClick={handleClick}
      disabled={isDisabled}
      aria-label={
        state === 'cooldown'
          ? `Resend available in ${secondsLeft} seconds`
          : label
      }
      className={cn(
        'gap-1.5 transition-all',
        state === 'sent' && 'text-[var(--success)]',
        state === 'error' && 'text-[var(--error)]',
        state === 'cooldown' && 'text-disabled cursor-not-allowed',
        className
      )}
    >
      {state === 'loading' && (
        <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />
      )}
      {state === 'sent' && (
        <CheckCircle className="h-3.5 w-3.5" aria-hidden />
      )}
      {state === 'cooldown' && (
        <Clock className="h-3.5 w-3.5" aria-hidden />
      )}
      {state === 'error' && (
        <RefreshCw className="h-3.5 w-3.5" aria-hidden />
      )}

      {state === 'idle' && label}
      {state === 'loading' && 'Sending…'}
      {state === 'sent' && sentLabel}
      {state === 'cooldown' && `Resend in ${secondsLeft}s`}
      {state === 'error' && 'Try again'}
    </Button>
  );
}
