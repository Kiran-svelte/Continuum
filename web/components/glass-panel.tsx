import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TiltCard } from '@/components/motion';

export interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}

export function GlassPanel({ children, className, interactive = false }: GlassPanelProps) {
  const content = (
    <div
      className={cn(
        "border border-border/40 dark:border-white/10 rounded-2xl relative overflow-hidden",
        interactive
          ? "bg-card/80 dark:bg-card/60 backdrop-blur-xl shadow-[0_0_20px_rgba(var(--primary-rgb),0.15)] hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)] transition-all duration-300"
          : "bg-card/80 dark:bg-black/40 backdrop-blur-xl shadow-2xl",
        className
      )}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-accent/50 opacity-50" />
      {children}
    </div>
  );

  if (interactive) {
    return <TiltCard>{content}</TiltCard>;
  }

  return content;
}
