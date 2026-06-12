import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}

export function GlassPanel({ children, className, interactive = false }: GlassPanelProps) {
  return (
    <div
      className={cn(
        'liquid-glass rounded-[var(--radius-lg)] relative overflow-hidden',
        interactive &&
          'cursor-pointer transition-[border-color,box-shadow] duration-200 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)]',
        className
      )}
    >
      <div className="absolute top-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-[color-mix(in_srgb,var(--primary)_35%,transparent)] to-transparent z-10" />
      <div className="relative z-0 readable-copy">{children}</div>
    </div>
  );
}
