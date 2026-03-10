'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
}

interface SidebarNavProps {
  items: NavItem[];
  onItemClick?: () => void;
}

export function SidebarNav({ items, onItemClick }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" data-tutorial="sidebar">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 relative group',
              isActive
                ? 'bg-primary/10 text-primary font-medium dark:bg-primary/15 dark:text-blue-400'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:hover:bg-white/5'
            )}
          >
            <Icon className={cn(
              'w-[18px] h-[18px] shrink-0 transition-all duration-200',
              isActive ? 'text-primary dark:text-blue-400' : 'text-muted-foreground group-hover:text-foreground'
            )} />
            <span className="tracking-tight flex-1">{item.label}</span>
            {item.badge && (
              <span className="min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                {item.badge}
              </span>
            )}
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary dark:bg-blue-400" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
