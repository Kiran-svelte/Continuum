'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, LifeBuoy } from 'lucide-react';

type PublicStatus = 'operational' | 'degraded' | 'outage';

type BannerState = {
  status: PublicStatus;
  message: string;
  statusPage: string;
  supportPage: string;
};

export function SystemStatusBanner() {
  const [state, setState] = useState<BannerState | null>(null);

  useEffect(() => {
    let active = true;

    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/status/public', { method: 'GET', credentials: 'include' });
        if (!res.ok) return;
        const json = (await res.json()) as BannerState;
        if (!active) return;
        if (json.status === 'operational') {
          setState(null);
          return;
        }
        setState(json);
      } catch {
        setState(null);
      }
    };

    void fetchStatus();
    const timer = window.setInterval(fetchStatus, 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  if (!state) return null;

  const palette =
    state.status === 'outage'
      ? 'bg-red-50 border-red-300 text-red-900'
      : 'bg-amber-50 border-amber-300 text-amber-900';

  return (
    <div className={`border-b ${palette}`}>
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm">
        <p className="font-medium">{state.message}</p>
        <div className="flex items-center gap-3">
          <Link href={state.statusPage} className="inline-flex items-center gap-1 hover:underline">
            <Activity className="w-3 h-3" />
            Status Page
          </Link>
          <Link href={state.supportPage} className="inline-flex items-center gap-1 hover:underline">
            <LifeBuoy className="w-3 h-3" />
            Support
          </Link>
        </div>
      </div>
    </div>
  );
}
