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
              'flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-200',
              isActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
            {isActive && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
