'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ContinuumAssistantWidget } from '@/components/assistant/continuum-assistant-widget';

const EXCLUDED_PREFIXES = [
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/super-admin',
  '/api',
];

function isExcludedPath(pathname: string): boolean {
  if (!pathname) return true;
  return EXCLUDED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function ContinuumAssistantHost() {
  const pathname = usePathname() ?? '';
  const [visible, setVisible] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isExcludedPath(pathname)) {
      setVisible(false);
      setChecked(true);
      return;
    }

    let cancelled = false;
    setChecked(false);

    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((me) => {
        if (cancelled) return;
        const role = typeof me?.primary_role === 'string' ? me.primary_role : '';
        const hasOrg = Boolean(me?.org_id);
        setVisible(role !== 'super_admin' && hasOrg);
        setChecked(true);
      })
      .catch(() => {
        if (!cancelled) {
          setVisible(false);
          setChecked(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!checked || !visible) {
    return null;
  }

  return <ContinuumAssistantWidget />;
}
