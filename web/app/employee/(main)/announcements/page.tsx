'use client';

/**
 * Employee Announcements Page — RALPH-20260630-008
 *
 * Employee view of company announcements.
 *
 * @module app/employee/(main)/announcements/page
 */

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Megaphone, Pin, Clock } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  pinned: boolean;
  published_at: string | null;
  expires_at: string | null;
}

const typeVariant: Record<string, 'default' | 'success' | 'warning' | 'info' | 'outline'> = {
  info: 'info',
  warning: 'warning',
  celebration: 'success',
  policy: 'default',
};

export default function EmployeeAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/announcements', { credentials: 'include' })
      .then((r) => r.json().catch(() => ({})))
      .then((d) => { setAnnouncements(d.announcements ?? []); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-4xl mx-auto w-full">
      <PageHeader
        title="Announcements"
        description="Company news and updates"
        icon={<Megaphone className="w-6 h-6" />}
      />

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : announcements.length === 0 ? (
        <div className="card p-12 text-center">
          <Megaphone className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">No announcements yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {announcements.map((a) => (
            <div key={a.id} className={`card p-5 ${a.pinned ? 'border-primary/30 bg-primary/5' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                {a.pinned && <Pin className="w-4 h-4 text-primary shrink-0" />}
                <h3 className="font-semibold">{a.title}</h3>
                <Badge variant={typeVariant[a.type] ?? 'outline'}>{a.type}</Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{a.content}</p>
              <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {new Date(a.published_at ?? '').toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
