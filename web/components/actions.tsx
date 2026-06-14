import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getButtonVariantClass, getButtonSizeClass } from '@/lib/ui/twentyfirst-adapter';
import { CanView } from '@/components/auth/can-view';

/** Supported button variant values. */
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success' | 'gradient';

/** Supported button size values. */
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ActionProps {
  label: string;
  icon?: React.ReactNode;
  permission?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

export interface NavigateActionProps extends ActionProps {
  href: string;
}

/**
 * NavigateAction renders an anchor link styled as a button.
 *
 * Uses Next.js `<Link>` directly (not Button with asChild) because the custom
 * Button component wraps a plain `<button>` element without Radix Slot support.
 * Applying button styling classes to an anchor is semantically correct for
 * navigation triggers.
 *
 * @param label - Visible button text.
 * @param icon - Optional leading icon element.
 * @param href - Navigation target.
 * @param permission - If provided, hides the element from unauthorized users.
 * @param variant - Button visual variant. Defaults to 'outline'.
 * @param size - Button size. Defaults to 'sm'.
 * @param className - Additional CSS classes.
 */
export function NavigateAction({
  label,
  icon,
  href,
  permission,
  variant = 'outline',
  size = 'sm',
  className,
}: NavigateActionProps) {
  const content = (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold',
        'transition-all duration-200 ease-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1',
        getButtonVariantClass(variant),
        getButtonSizeClass(size),
        className
      )}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {label}
    </Link>
  );

  if (permission) {
    return <CanView require={permission}>{content}</CanView>;
  }

  return content;
}

export interface ModalActionProps extends ActionProps {
  onClick: () => void;
}

/**
 * ModalAction renders a plain button that triggers a modal or callback.
 *
 * @param label - Visible button text.
 * @param icon - Optional leading icon element.
 * @param onClick - Click handler.
 * @param permission - If provided, hides the element from unauthorized users.
 * @param variant - Button visual variant. Defaults to 'outline'.
 * @param size - Button size. Defaults to 'sm'.
 * @param className - Additional CSS classes.
 */
export function ModalAction({
  label,
  icon,
  onClick,
  permission,
  variant = 'outline',
  size = 'sm',
  className,
}: ModalActionProps) {
  const content = (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold',
        'transition-all duration-200 ease-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        getButtonVariantClass(variant),
        getButtonSizeClass(size),
        className
      )}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {label}
    </button>
  );

  if (permission) {
    return <CanView require={permission}>{content}</CanView>;
  }

  return content;
}
