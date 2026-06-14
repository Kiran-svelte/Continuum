import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Clock3,
  Loader2,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type StatusBadgeStatus =
  | 'approved'
  | 'pending'
  | 'rejected'
  | 'escalated'
  | 'cancelled'
  | 'processing'
  | 'completed'
  | 'failed';

const STATUS_META: Record<
  StatusBadgeStatus,
  { label: string; tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; Icon: LucideIcon; pulse?: boolean }
> = {
  approved: { label: 'Approved', tone: 'success', Icon: CheckCircle2 },
  completed: { label: 'Completed', tone: 'success', Icon: CheckCircle2 },
  pending: { label: 'Pending', tone: 'warning', Icon: Clock3 },
  escalated: { label: 'Escalated', tone: 'danger', Icon: AlertCircle, pulse: true },
  rejected: { label: 'Rejected', tone: 'danger', Icon: XCircle },
  failed: { label: 'Failed', tone: 'danger', Icon: XCircle },
  cancelled: { label: 'Cancelled', tone: 'neutral', Icon: Circle },
  processing: { label: 'Processing', tone: 'info', Icon: Loader2 },
};

const TONE_CLASS: Record<string, string> = {
  success:
    'border-[color-mix(in_srgb,var(--status-success)_40%,transparent)] bg-[color-mix(in_srgb,var(--status-success)_14%,transparent)] text-[var(--status-success)]',
  warning:
    'border-[color-mix(in_srgb,var(--status-warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--status-warning)_14%,transparent)] text-[var(--status-warning)]',
  danger:
    'border-[color-mix(in_srgb,var(--status-danger)_40%,transparent)] bg-[color-mix(in_srgb,var(--status-danger)_14%,transparent)] text-[var(--status-danger)]',
  info:
    'border-[color-mix(in_srgb,var(--primary)_40%,transparent)] bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] text-[var(--primary)]',
  neutral: 'border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]',
};

export interface StatusBadgeProps {
  status: StatusBadgeStatus | string;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const normalized = status.toLowerCase().replace(/\s+/g, '_') as StatusBadgeStatus;
  const meta = STATUS_META[normalized] ?? {
    label: label ?? status,
    tone: 'neutral' as const,
    Icon: Circle,
  };
  const Icon = meta.Icon;

  return (
    <span
      className={cn(
        'status-pill',
        TONE_CLASS[meta.tone],
        meta.pulse && 'animate-pulse',
        className
      )}
      aria-label={`Status: ${label ?? meta.label}`}
      data-tone={meta.tone}
    >
      <Icon
        className={cn('h-3.5 w-3.5 shrink-0', normalized === 'processing' && 'animate-spin')}
        aria-hidden
      />
      {label ?? meta.label}
    </span>
  );
}
