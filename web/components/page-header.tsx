import { ReactNode } from 'react';
import { FadeIn, TiltCard } from '@/components/motion';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function PageHeader({ title, description, icon, action }: PageHeaderProps) {
  return (
    <FadeIn>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          {icon && (
            <TiltCard>
              <div className="w-12 h-12 bg-primary/20 backdrop-blur-md shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] border border-primary/30 rounded-2xl flex items-center justify-center shrink-0">
                {icon}
              </div>
            </TiltCard>
          )}
          <div>
            <h1 className="text-3xl font-bold text-white drop-shadow-md">{title}</h1>
            {description && <p className="text-white/60 mt-1">{description}</p>}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
    </FadeIn>
  );
}