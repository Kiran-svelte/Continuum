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
        "glass-card border-none rounded-2xl relative overflow-hidden",
        interactive && "hover:scale-[1.02] cursor-pointer",
        className
      )}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-accent/50 opacity-50 z-10" />
      <div className="relative z-0">
        {children}
      </div>
    </div>
  );

  if (interactive) {
    return <TiltCard>{content}</TiltCard>;
  }

  return content;
}
