'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, CheckCircle2, XCircle, FileText, Wallet, AlertTriangle, Clock, FolderOpen, Users, Check } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const iconMap: Record<string, React.ReactNode> = {
  'leave-request-submitted': <FileText className="w-5 h-5 text-blue-500" />,
  'leave-request-approved': <CheckCircle2 className="w-5 h-5 text-green-500" />,
  'leave-request-rejected': <XCircle className="w-5 h-5 text-red-500" />,
  'leave-balance-updated': <Wallet className="w-5 h-5 text-amber-500" />,
  'sla-breach-warning': <AlertTriangle className="w-5 h-5 text-red-600" />,
  'attendance': <Clock className="w-5 h-5 text-indigo-500" />,
  'document': <FolderOpen className="w-5 h-5 text-teal-500" />,
  'employee': <Users className="w-5 h-5 text-purple-500" />,
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
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-4 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-semibold bg-primary text-primary-foreground rounded-full">
              {unreadCount} unread
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            Mark all as read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            filter === 'unread'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          Unread ({unreadCount})
        </button>
        {typeCategories.length > 1 && (
          <>
            <div className="w-px bg-border self-stretch mx-1" />
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                typeFilter === 'all'
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              All types
            </button>
            {typeCategories.map(cat => {
              const types = typeCategoryMap[cat];
              const isActive = types.some(t => t === typeFilter) || (typeFilter === cat);
              return (
                <button
                  key={cat}
                  onClick={() => setTypeFilter(isActive ? 'all' : types[0])}
                  className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* Notification list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <BellOff className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {filter === 'unread'
              ? 'You have no unread notifications.'
              : 'Notifications from leave requests, attendance, and other events will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((notif) => (
            <div
              key={notif.id}
              className={`flex items-start gap-3 p-4 rounded-xl border transition-colors cursor-pointer ${
                notif.is_read
                  ? 'bg-card border-border hover:bg-muted/50'
                  : 'bg-primary/5 border-primary/20 hover:bg-primary/10'
              }`}
              onClick={() => !notif.is_read && markAsRead(notif.id)}
            >
              <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                {getIcon(notif.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm ${notif.is_read ? 'text-foreground' : 'text-foreground font-semibold'}`}>
                    {notif.title}
                  </p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {timeAgo(notif.created_at)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                  {notif.message}
                </p>
              </div>
              {!notif.is_read && (
                <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-1.5" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
