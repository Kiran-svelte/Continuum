import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface TabButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: ReactNode;
}

export function TabButton({ active, children, className, ...props }: TabButtonProps) {
  return (
    <button
      className={cn(
        "px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-300 relative inline-flex items-center gap-2 outline-none",
        active 
          ? "text-white bg-primary/20 shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)] border border-primary/40 ring-1 ring-primary/20"
          : "text-white/60 hover:text-white hover:bg-white/10 border border-transparent",
        className
      )}
      {...props}
    >
      {active && (
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-xl pointer-events-none blur-[2px]" />
      )}
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
}