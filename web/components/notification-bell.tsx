'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPusherClient, getUserChannelName, type PusherEventType } from '@/lib/pusher-client';
import { ensureMe } from '@/lib/client-auth';
import { SkeletonNotification } from '@/components/ui/skeleton';
import {
  Bell,
  BellOff,
  FileText,
  CheckCircle2,
  XCircle,
  Wallet,
  AlertTriangle,
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  data?: Record<string, any>;
}

interface PusherNotificationData {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}

const notificationIconMap: Record<string, React.ReactNode> = {
  'leave-request-submitted': <FileText className="w-5 h-5 text-blue-500" />,
  'leave-request-approved': <CheckCircle2 className="w-5 h-5 text-green-500" />,
  'leave-request-rejected': <XCircle className="w-5 h-5 text-red-500" />,
  'leave-balance-updated': <Wallet className="w-5 h-5 text-amber-500" />,
  'sla-breach-warning': <AlertTriangle className="w-5 h-5 text-red-600" />,
  'user-notification': <Bell className="w-5 h-5 text-primary" />,
  'default': <Bell className="w-5 h-5 text-primary" />,
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Get user ID for Pusher channel subscription
  useEffect(() => {
    async function getUserId() {
      const me = await ensureMe();
      if (me?.id) {
        setUserId(me.id);
      }
    }
    getUserId();
  }, []);

  // Load initial notifications
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications?limit=20');
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.notifications ?? []);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize real-time connection
  useEffect(() => {
    if (!userId) return;

    setConnecting(true);
    const pusher = getPusherClient();

    if (!pusher) {
      console.warn('Pusher not available. Real-time notifications disabled.');
      setConnecting(false);
      return;
    }

    // Subscribe to user-specific channel
    const userChannelName = getUserChannelName(userId);
    const channel = pusher.subscribe(userChannelName);
    channelRef.current = channel;

    // Handle connection state
    pusher.connection.bind('connected', () => {
      setConnecting(false);
      console.log('Pusher connected successfully');
    });

    pusher.connection.bind('disconnected', () => {
      setConnecting(true);
      console.log('Pusher disconnected');
    });

    // Handle real-time notification events
    const handleNewNotification = (data: PusherNotificationData) => {
      const newNotification: Notification = {
        id: data.id || Date.now().toString(),
        type: data.type,
        title: data.title,
        message: data.message,
        is_read: false,
        created_at: new Date().toISOString(),
        data: data.data,
      };

      setNotifications(prev => [newNotification, ...prev.slice(0, 19)]);
      setHasNewNotification(true);

      // Auto-hide the new notification indicator after 3 seconds
      setTimeout(() => setHasNewNotification(false), 3000);

      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification(data.title, {
          body: data.message,
          icon: '/favicon.ico',
        });
      }
    };

    // Bind to all notification event types
    const eventTypes: PusherEventType[] = [
      'leave-request-submitted',
      'leave-request-approved',
      'leave-request-rejected',
      'leave-balance-updated',
      'sla-breach-warning',
      'user-notification'
    ];

    eventTypes.forEach(eventType => {
      channel.bind(eventType, handleNewNotification);
    });

    return () => {
      if (channelRef.current) {
        eventTypes.forEach(eventType => {
          channelRef.current.unbind(eventType, handleNewNotification);
        });
        pusher.unsubscribe(userChannelName);
      }
    };
  }, [userId]);

  // Load notifications once user ID is available
  useEffect(() => {
    if (userId) {
      loadNotifications();
    }
  }, [userId, loadNotifications]);

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function markRead(id: string) {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  async function markAllRead() {
    try {
      await fetch('/api/notifications/read-all', { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  function getNotificationIcon(type: string) {
    return notificationIconMap[type] || notificationIconMap.default;
  }

  return (
    <div className="relative" ref={ref}>
      {/* Enhanced notification bell button */}
      <motion.button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg hover:bg-secondary/50 transition-colors"
        title="Notifications"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.span
          className="flex items-center justify-center"
          animate={hasNewNotification ? { rotate: [0, 15, -15, 0] } : {}}
          transition={{ duration: 0.5 }}
        >
          <Bell className="w-5 h-5 text-foreground" />
        </motion.span>

        {/* Connection status indicator */}
        {connecting && (
          <div className="absolute -top-1 -left-1 w-3 h-3">
            <div className="w-3 h-3 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Unread count badge with animation */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium leading-none px-1"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Enhanced dropdown with animations */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: "spring", duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-80 bg-background rounded-xl shadow-xl border border-border z-50 overflow-hidden"
          >
            {/* Header with better styling */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-foreground" />
                <p className="text-sm font-semibold text-foreground">
                  Notifications
                </p>
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium"
                  >
                    {unreadCount}
                  </motion.span>
                )}
                {connecting && (
                  <span className="text-xs text-yellow-600 dark:text-yellow-400">
                    Connecting...
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notifications list with improved styling */}
            <div className="max-h-72 overflow-y-auto">
              {loading && (
                <div className="space-y-2 p-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <SkeletonNotification key={i} />
                  ))}
                </div>
              )}

              {!loading && notifications.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <BellOff className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No notifications yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Real-time notifications are {connecting ? 'connecting' : 'active'}
                    </p>
                  </motion.div>
                </div>
              )}

              {!loading && notifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => !notification.is_read && markRead(notification.id)}
                  className={`px-4 py-3 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 transition-all ${
                    !notification.is_read ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Notification type icon */}
                    <span className="mt-0.5 shrink-0">
                      {getNotificationIcon(notification.type)}
                    </span>

                    {/* Notification content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-xs text-muted-foreground">
                          {timeAgo(notification.created_at)}
                        </p>
                        {!notification.is_read && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0"
                                title="Unread" />
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Enhanced footer */}
            <div className="px-4 py-2 border-t border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {notifications.length === 0
                    ? 'No notifications'
                    : `Showing ${notifications.length} recent notifications`}
                </p>
                <div className="flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${connecting ? 'bg-yellow-500' : 'bg-green-500'}`} />
                  <span className="text-xs text-muted-foreground">
                    {connecting ? 'Connecting' : 'Live'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
