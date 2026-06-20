'use client';

import { useEffect } from 'react';
import Clarity from '@microsoft/clarity';
import { useAuth } from '@/components/auth/auth-provider';

const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim() || '';

function friendlyName(user: {
  first_name?: string | null;
  last_name?: string | null;
  email: string;
}): string {
  const full = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return full || user.email.split('@')[0] || user.email;
}

export function ClarityAnalytics() {
  const { user } = useAuth();

  useEffect(() => {
    if (!projectId) return;
    Clarity.init(projectId);
  }, []);

  useEffect(() => {
    if (!projectId || !user?.id) return;

    Clarity.identify(user.id, undefined, undefined, friendlyName(user));

    if (user.primary_role) {
      Clarity.setTag('role', user.primary_role);
    }
    if (user.company?.id) {
      Clarity.setTag('org_id', user.company.id);
    }
  }, [user]);

  return null;
}
