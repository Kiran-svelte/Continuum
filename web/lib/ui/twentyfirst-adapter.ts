import { cn } from '@/lib/utils';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'ghost'
  | 'outline'
  | 'success'
  | 'gradient';

export type ButtonSize = 'sm' | 'md' | 'lg';

export type CardVariant = 'default' | 'elevated' | 'bordered' | 'ghost' | 'glass' | 'premium';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'outline'
  | 'live'
  | 'premium';

export type BadgeSize = 'sm' | 'md' | 'lg';

export type ModalIntent = 'danger' | 'warning' | 'info';

export const twentyFirstAdapterSurfaceRegistry = {
  button: true,
  input: true,
  card: true,
  modal: true,
  badge: true,
  tabs: true,
  textarea: true,
} as const;

const buttonInteractionGuard =
  'active:scale-100 transform-none active:brightness-100 hover:scale-100';

const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary:
    `bg-primary text-primary-foreground border border-primary shadow-sm hover:bg-[var(--accent-primary-hover)] hover:border-[var(--accent-primary-hover)] hover:shadow-md ${buttonInteractionGuard}`,
  secondary:
    `bg-muted border border-border text-foreground hover:bg-secondary hover:border-[var(--border-strong)] ${buttonInteractionGuard}`,
  danger:
    `bg-destructive text-destructive-foreground border border-destructive hover:brightness-95 ${buttonInteractionGuard}`,
  ghost:
    `text-foreground hover:bg-muted border border-transparent ${buttonInteractionGuard}`,
  outline: `border border-border bg-transparent text-foreground hover:bg-accent hover:border-primary hover:text-primary ${buttonInteractionGuard}`,
  success:
    `bg-[color-mix(in_srgb,var(--status-success)_85%,transparent)] text-white border border-[var(--status-success)] hover:brightness-95 ${buttonInteractionGuard}`,
  gradient:
    `bg-gradient-to-r from-primary to-[var(--accent-primary-hover)] text-primary-foreground shadow-sm hover:shadow-md ${buttonInteractionGuard}`,
};

const buttonSizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3.5 py-1.5 text-sm',
  md: 'px-4.5 py-2 text-sm',
  lg: 'px-6 py-2.5 text-base',
};

const cardVariantClasses: Record<CardVariant, string> = {
  default: 'border-border bg-card text-card-foreground shadow-sm',
  elevated: 'border-border bg-card text-card-foreground shadow-md',
  bordered: 'border-border bg-card text-card-foreground shadow-none',
  ghost: 'bg-transparent',
  glass: 'bg-card/90 backdrop-blur border-border text-card-foreground shadow-sm',
  premium: 'bg-card text-card-foreground shadow-lg border-border',
};

const badgeVariantClasses: Record<BadgeVariant, string> = {
  default: 'bg-accent text-accent-foreground',
  success:
    'bg-[color-mix(in_srgb,var(--status-success)_15%,transparent)] text-[var(--status-success)] border border-[color-mix(in_srgb,var(--status-success)_40%,transparent)]',
  warning:
    'bg-[color-mix(in_srgb,var(--status-warning)_15%,transparent)] text-[var(--status-warning)] border border-[color-mix(in_srgb,var(--status-warning)_40%,transparent)]',
  danger:
    'bg-[color-mix(in_srgb,var(--status-danger)_15%,transparent)] text-destructive border border-[color-mix(in_srgb,var(--status-danger)_40%,transparent)]',
  info:
    'bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] text-primary border border-[color-mix(in_srgb,var(--primary)_40%,transparent)]',
  outline: 'border border-border bg-transparent text-muted-foreground',
  live:
    'bg-[color-mix(in_srgb,var(--status-success)_20%,transparent)] text-[var(--status-success)] animate-pulse border border-[color-mix(in_srgb,var(--status-success)_40%,transparent)]',
  premium: 'bg-gradient-to-r from-primary/20 to-accent/60 text-primary border border-primary/30',
};

const badgeSizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
};

const modalIntentClasses: Record<ModalIntent, string> = {
  danger:
    'bg-destructive text-destructive-foreground hover:brightness-95 shadow-[0_0_0_1px_color-mix(in_srgb,var(--status-danger)_45%,transparent)]',
  warning:
    'bg-[color-mix(in_srgb,var(--status-warning)_86%,var(--card))] text-foreground hover:brightness-95 shadow-[0_0_0_1px_color-mix(in_srgb,var(--status-warning)_55%,transparent)]',
  info:
    'bg-primary text-primary-foreground hover:brightness-95 shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary)_55%,transparent)]',
};

const modalIntentIconClasses: Record<ModalIntent, string> = {
  danger:
    'bg-[color-mix(in_srgb,var(--status-danger)_16%,transparent)] text-destructive border border-[color-mix(in_srgb,var(--status-danger)_35%,transparent)]',
  warning:
    'bg-[color-mix(in_srgb,var(--status-warning)_16%,transparent)] text-[var(--status-warning)] border border-[color-mix(in_srgb,var(--status-warning)_35%,transparent)]',
  info:
    'bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] text-primary border border-[color-mix(in_srgb,var(--primary)_35%,transparent)]',
};

export function getButtonVariantClass(variant: ButtonVariant): string {
  return buttonVariantClasses[variant];
}

export function getButtonSizeClass(size: ButtonSize): string {
  return buttonSizeClasses[size];
}

export function getCardVariantClass(variant: CardVariant): string {
  return cardVariantClasses[variant];
}

export function getBadgeVariantClass(variant: BadgeVariant): string {
  return badgeVariantClasses[variant];
}

export function getBadgeSizeClass(size: BadgeSize): string {
  return badgeSizeClasses[size];
}

export function getModalIntentClass(intent: ModalIntent): string {
  return modalIntentClasses[intent];
}

export function getModalIntentIconClass(intent: ModalIntent): string {
  return modalIntentIconClasses[intent];
}

export function getFormFieldToneClass(hasError: boolean): string {
  return hasError
    ? 'border-destructive focus:ring-destructive/40 focus:border-destructive/70'
    : 'border-[var(--border)] hover:border-[var(--border-strong)]';
}

export function getFormFieldMessageClass(hasError: boolean): string {
  return hasError ? 'text-destructive' : 'text-muted-foreground';
}

export function getTabsTriggerInteractiveClass(): string {
  return 'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring';
}

export function getTextareaSurfaceClass(): string {
  return 'border-input bg-input/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';
}

export function getInteractiveLinkClass(): string {
  return cn(
    'underline decoration-[color-mix(in_srgb,var(--primary)_35%,transparent)] underline-offset-[0.16em]',
    'hover:text-primary hover:decoration-primary',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-[4px]'
  );
}
