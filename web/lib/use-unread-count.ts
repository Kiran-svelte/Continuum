'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to fetch unread notification count for sidebar badge display.
 * Polls every 60 seconds for fresh counts.
 */
export function useUnreadCount(): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=1', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCount(data.unread_count ?? 0);
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return count;
}
