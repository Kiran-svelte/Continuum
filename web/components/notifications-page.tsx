'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellOff, CheckCircle2, XCircle, FileText, Wallet, AlertTriangle, Clock, FolderOpen, Users, Check, Loader2 } from 'lucide-react';
import { TiltCard, FadeIn, StaggerContainer } from '@/components/motion';
import { GlassPanel } from '@/components/glass-panel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const iconMap: Record<string, React.ReactNode> = {
  'leave-request-submitted': <FileText className="w-5 h-5 text-blue-300" />,
  'leave-request-approved': <CheckCircle2 className="w-5 h-5 text-green-400" />,
  'leave-request-rejected': <XCircle className="w-5 h-5 text-red-400" />,
  'leave-balance-updated': <Wallet className="w-5 h-5 text-amber-400" />,
  'sla-breach-warning': <AlertTriangle className="w-5 h-5 text-red-500" />,
  'attendance': <Clock className="w-5 h-5 text-indigo-400" />,
  'document': <FolderOpen className="w-5 h-5 text-teal-300" />,
  'employee': <Users className="w-5 h-5 text-purple-400" />,
  'default': <Bell className="w-5 h-5 text-primary" />,
};

function getIcon(type: string) {
  return iconMap[type] || iconMap['default'];
}

function timeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function NotificationsLoadingSkeleton() {
  return (
    <div className="p-4 sm:p-6 pb-32 max-w-3xl mx-auto">
      <div className="space-y-8">
        {/* Header skeleton */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 bg-white/10" />
            <Skeleton className="h-5 w-24 bg-white/10" />
          </div>
          <Skeleton className="h-10 w-36 bg-white/10 rounded-lg" />
        </div>

        {/* Filters skeleton */}
        <div className="flex gap-3">
          <Skeleton className="h-9 w-24 bg-white/10 rounded-lg" />
          <Skeleton className="h-9 w-24 bg-white/10 rounded-lg" />
          <Skeleton className="h-9 w-20 bg-white/10 rounded-lg" />
          <Skeleton className="h-9 w-20 bg-white/10 rounded-lg" />
        </div>

        {/* List skeleton */}
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 flex items-start gap-4">
              <Skeleton className="w-12 h-12 rounded-full bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-1/2 bg-white/10" />
                  <Skeleton className="h-4 w-16 bg-white/10" />
                </div>
                <Skeleton className="h-4 w-3/4 bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=50', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  async function markAsRead(id: string) {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', credentials: 'include' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {
      // ignore
    }
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await fetch('/api/notifications/read-all', { method: 'PATCH', credentials: 'include' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {
      // ignore
    } finally {
      setMarkingAll(false);
    }
  }

  const filtered = notifications.filter(n => {
    if (filter === 'unread' && n.is_read) return false;
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    return true;
  });
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Derive available notification types from actual data
  const availableTypes = Array.from(new Set(notifications.map(n => n.type))).sort();

  const TYPE_LABELS: Record<string, string> = {
    'leave-request-submitted': 'Leave',
    'leave-request-approved': 'Leave',
    'leave-request-rejected': 'Leave',
    'leave-balance-updated': 'Leave',
    'sla-breach-warning': 'SLA',
    'attendance': 'Attendance',
    'document': 'Document',
    'employee': 'Employee',
    'reimbursement': 'Reimbursement',
    'exit-checklist': 'Exit Checklist',
  };

  // Group types into display categories
  const typeCategories = Array.from(new Set(availableTypes.map(t => TYPE_LABELS[t] || t)));
  const typeCategoryMap: Record<string, string[]> = {};
  for (const t of availableTypes) {
    const cat = TYPE_LABELS[t] || t;
    if (!typeCategoryMap[cat]) typeCategoryMap[cat] = [];
    typeCategoryMap[cat].push(t);
  }

  if (loading) {
    return <NotificationsLoadingSkeleton />;
  }

  return (
    <div className="p-4 sm:p-6 pb-32 max-w-3xl mx-auto">
      <StaggerContainer>
        {/* Header */}
        <FadeIn>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Bell className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-white drop-shadow-lg">Notifications</h1>
                {unreadCount > 0 && (
                  <span className="text-sm text-primary font-semibold animate-pulse">
                    {unreadCount} unread
                  </span>
                )}
              </div>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                onClick={markAllRead}
                disabled={markingAll}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                {markingAll ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Mark all as read
              </Button>
            )}
          </div>
        </FadeIn>

        {/* Filters */}
        <FadeIn>
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <Button
              size="sm"
              variant={filter === 'all' ? 'primary' : 'outline'}
              onClick={() => setFilter('all')}
              className={`transition-all ${filter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'}`}
            >
              All ({notifications.length})
            </Button>
            <Button
              size="sm"
              variant={filter === 'unread' ? 'primary' : 'outline'}
              onClick={() => setFilter('unread')}
              className={`transition-all ${filter === 'unread' ? 'bg-primary text-primary-foreground' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'}`}
            >
              Unread ({unreadCount})
            </Button>
            {typeCategories.length > 1 && (
              <>
                <div className="w-px bg-white/10 self-stretch mx-2" />
                <Button
                  size="sm"
                  variant={typeFilter === 'all' ? 'secondary' : 'outline'}
                  onClick={() => setTypeFilter('all')}
                  className={`transition-all text-xs px-2.5 py-1 h-auto ${typeFilter === 'all' ? 'bg-primary/20 text-primary border-primary/30' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'}`}
                >
                  All types
                </Button>
                {typeCategories.map(cat => {
                  const types = typeCategoryMap[cat];
                  const isActive = types.some(t => t === typeFilter) || (typeFilter === cat);
                  return (
                    <Button
                      key={cat}
                      size="sm"
                      variant={isActive ? 'secondary' : 'outline'}
                      onClick={() => setTypeFilter(isActive ? 'all' : types[0])}
                      className={`transition-all text-xs px-2.5 py-1 h-auto ${isActive ? 'bg-primary/20 text-primary border-primary/30' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'}`}
                    >
                      {cat}
                    </Button>
                  );
                })}
              </>
            )}
          </div>
        </FadeIn>

        {/* Notification list */}
        {filtered.length === 0 ? (
          <FadeIn>
            <GlassPanel className="text-center py-24">
              <BellOff className="w-16 h-16 text-white/30 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
              </h3>
              <p className="text-sm text-white/60 max-w-xs mx-auto">
                {filter === 'unread'
                  ? 'You have no unread notifications.'
                  : 'Important updates and alerts will appear here.'}
              </p>
            </GlassPanel>
          </FadeIn>
        ) : (
          <div className="space-y-3">
            {filtered.map((notif, i) => (
              <FadeIn key={notif.id} delay={i * 0.05}>
                <TiltCard>
                  <div
                    className={`glass-panel-interactive border rounded-2xl p-4 flex items-start gap-4 cursor-pointer transition-all duration-300 ${
                      notif.is_read
                        ? 'border-white/10'
                        : 'border-primary/40 shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]'
                    }`}
                    onClick={() => !notif.is_read && markAsRead(notif.id)}
                  >
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-white/10 shadow-inner ${notif.is_read ? '' : 'shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]'}`}>
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${notif.is_read ? 'text-white/80' : 'text-white font-semibold'}`}>
                          {notif.title}
                        </p>
                        <span className="text-xs text-white/50 whitespace-nowrap shrink-0 pt-0.5">
                          {timeAgo(notif.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-white/60 mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                    </div>
                    {!notif.is_read && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-1.5 animate-pulse" />
                    )}
                  </div>
                </TiltCard>
              </FadeIn>
            ))}
          </div>
        )}
      </StaggerContainer>
    </div>
  );
}
