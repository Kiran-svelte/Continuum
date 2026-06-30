'use client';

/**
 * Announcements Page — RALPH-20260630-008
 *
 * Company announcements board: HR creates, all employees view.
 *
 * @module app/hr/(main)/announcements/page
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureMe } from '@/lib/client-auth';
import { Megaphone, Pin, Plus, Clock } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  pinned: boolean;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const typeVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline'> = {
  info: 'info',
  warning: 'warning',
  celebration: 'success',
  policy: 'default',
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);

  const load = useCallback(async () => {
    try {
      const me = await ensureMe();
      if (!me) return;
      const perms = (me.permissions ?? []) as string[];
      setCanManage(perms.includes('hr.manage_announcements'));

      const res = await fetch('/api/announcements', { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      setAnnouncements(data.announcements ?? []);
    } catch {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, []);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto w-full">
      <PageHeader
        title="Announcements"
        description="Company-wide news and updates"
        icon={<Megaphone className="w-6 h-6" />}
        action={canManage ? (
          <Button size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            New Announcement
          </Button>
        ) : undefined}
      />

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : announcements.length === 0 ? (
        <div className="card p-12 text-center">
          <Megaphone className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No announcements yet.</p>
          {canManage && (
            <Button className="mt-4 gap-2" size="sm">
              <Plus className="w-4 h-4" />
              Post First Announcement
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {announcements.map((a) => (
            <div key={a.id} className={`card p-5 ${a.pinned ? 'border-primary/30 bg-primary/5' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {a.pinned && <Pin className="w-4 h-4 text-primary shrink-0" />}
                    <h3 className="font-semibold">{a.title}</h3>
                    <Badge variant={typeVariant[a.type] ?? 'outline'}>{a.type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{a.content}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(a.published_at ?? a.created_at).toLocaleDateString()}
                    </span>
                    {a.expires_at && (
                      <span>Expires {new Date(a.expires_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                {canManage && (
                  <Button size="sm" variant="ghost">Edit</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
