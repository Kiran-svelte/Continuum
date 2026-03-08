'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: string;
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
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-300 relative group',
              isActive
                ? 'bg-primary/10 text-primary font-medium dark:bg-primary/15 dark:text-primary-foreground border-l-[3px] border-primary ml-[-3px] pl-[15px]'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:hover:bg-white/5'
            )}
          >
            <span className={cn(
              'text-lg transition-transform duration-300',
              isActive && 'scale-110',
              !isActive && 'group-hover:scale-105'
            )}>
              {item.icon}
            </span>
            <span className="tracking-tight">{item.label}</span>
            {isActive && (
              <span className="ml-auto w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
