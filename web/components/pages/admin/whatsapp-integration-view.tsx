'use client';

import React from 'react';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Admin WhatsApp WABA connect UI (visible only when NEXT_PUBLIC_WHATSAPP_ENABLED=true).
 */
export default function AdminWhatsAppIntegrationView() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6 md:p-8">
      <header>
        <h1 className="text-display flex items-center gap-2">
          <MessageCircle className="h-7 w-7 text-[var(--primary)]" />
          WhatsApp Integration
        </h1>
        <p className="text-body mt-2 text-[var(--muted-foreground)]">
          Connect your company WhatsApp Business Account for Zero UI HR actions.
        </p>
      </header>

      <div className="card border border-[var(--border)] p-6">
        <p className="text-sm text-[var(--muted-foreground)]">
          WABA connect flow is enabled in this environment. Complete Meta verification and webhook setup per runbook.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button disabled>Connect WhatsApp Business</Button>
          <Link
            href="/admin/getting-started"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            Back to Getting Started
          </Link>
        </div>
      </div>
    </div>
  );
}
