'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

/** Enterprise static layout wrapper — no stagger animation on operational surfaces. */
export function StaggerContainer({ children, className }: StaggerContainerProps) {
  return <div className={className}>{children}</div>;
}

interface FadeInProps {
  children: ReactNode;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  delay?: number;
  duration?: number;
}

/** Enterprise static layout wrapper — no fade/slide animation on operational surfaces. */
export function FadeIn({ children, className }: FadeInProps) {
  return <div className={cn(className)}>{children}</div>;
}
