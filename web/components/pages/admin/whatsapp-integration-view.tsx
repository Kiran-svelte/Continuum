'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MessageCircle, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * Admin WhatsApp WABA connect UI (visible only when NEXT_PUBLIC_WHATSAPP_ENABLED=true).
 */
export default function AdminWhatsAppIntegrationView() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<'idle' | 'success' | 'error'>('idle');

  /** Opens the Meta Business Manager for WABA registration in a new tab. */
  const handleConnectWABA = () => {
    setIsConnecting(true);
    // Meta's Embedded Signup URL for WhatsApp Business API
    const metaSignupUrl = 'https://business.facebook.com/wa/manage/phone-numbers/';
    window.open(metaSignupUrl, '_blank', 'noopener,noreferrer');
    toast.info('Meta Business Manager opened. Complete WABA registration there, then return to configure your webhook.');
    setIsConnecting(false);
  };

  /** Tests the configured WhatsApp webhook endpoint. */
  const handleTestWebhook = async () => {
    setWebhookTestResult('idle');
    try {
      const res = await fetch('/api/webhooks/whatsapp', {
        method: 'GET',
        credentials: 'include',
      });
      if (res.ok) {
        setWebhookTestResult('success');
        toast.success('Webhook endpoint is reachable and responding correctly.');
      } else {
        setWebhookTestResult('error');
        toast.error(`Webhook returned ${res.status}. Check your WHATSAPP_VERIFY_TOKEN env variable.`);
      }
    } catch {
      setWebhookTestResult('error');
      toast.error('Could not reach the webhook endpoint. Is the server running?');
    }
  };

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

      {/* Step 1: WABA Setup */}
      <div className="card border border-[var(--border)] p-6">
        <h2 className="text-h4 font-semibold mb-1">Step 1 — Register WhatsApp Business Account</h2>
        <p className="text-sm text-[var(--muted-foreground)] mb-4">
          Click below to open Meta Business Manager. Complete the WABA embedded signup flow,
          then return here with your Phone Number ID and WABA ID.
        </p>
        <Button onClick={handleConnectWABA} disabled={isConnecting} id="btn-connect-whatsapp">
          <ExternalLink className="w-4 h-4 mr-2" />
          {isConnecting ? 'Opening Meta...' : 'Open Meta Business Manager'}
        </Button>
      </div>

      {/* Step 2: Webhook Test */}
      <div className="card border border-[var(--border)] p-6">
        <h2 className="text-h4 font-semibold mb-1">Step 2 — Verify Webhook</h2>
        <p className="text-sm text-[var(--muted-foreground)] mb-4">
          After adding your webhook URL (<code className="text-xs bg-[var(--muted)] px-1 rounded">/api/webhooks/whatsapp</code>) to Meta,
          test that it is responding correctly.
        </p>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleTestWebhook} id="btn-test-whatsapp-webhook">
            Test Webhook
          </Button>
          {webhookTestResult === 'success' && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" /> Webhook OK
            </span>
          )}
          {webhookTestResult === 'error' && (
            <span className="flex items-center gap-1 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" /> Webhook failed
            </span>
          )}
        </div>
      </div>

      {/* Step 3: Runbook */}
      <div className="card border border-[var(--border)] p-6">
        <h2 className="text-h4 font-semibold mb-1">Step 3 — Set Environment Variables</h2>
        <p className="text-sm text-[var(--muted-foreground)] mb-3">Add these to your Vercel / Render environment:</p>
        <ul className="text-sm space-y-1 text-[var(--muted-foreground)] list-disc list-inside">
          <li><code className="text-xs bg-[var(--muted)] px-1 rounded">WHATSAPP_PHONE_NUMBER_ID</code> — from Meta dashboard</li>
          <li><code className="text-xs bg-[var(--muted)] px-1 rounded">WHATSAPP_WABA_ID</code> — from Meta dashboard</li>
          <li><code className="text-xs bg-[var(--muted)] px-1 rounded">WHATSAPP_ACCESS_TOKEN</code> — permanent system user token</li>
          <li><code className="text-xs bg-[var(--muted)] px-1 rounded">WHATSAPP_VERIFY_TOKEN</code> — any random string you choose</li>
        </ul>
      </div>

      <Link
        href="/admin/getting-started"
        className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground w-fit"
      >
        ← Back to Getting Started
      </Link>
    </div>
  );
}
