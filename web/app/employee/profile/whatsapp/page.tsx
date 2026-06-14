'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MessageCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Employee WhatsApp phone verification page.
 * Route: /employee/profile/whatsapp
 */
export default function EmployeeWhatsAppProfilePage() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [externalId, setExternalId] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startVerify() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/channel/verify/start', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, channel: 'whatsapp' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? 'Could not send verification code.');
        return;
      }
      setStep('code');
      setMessage('Verification code sent to your work email.');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function confirmVerify() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/channel/verify/confirm', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, channel: 'whatsapp', externalId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? 'Verification failed.');
        return;
      }
      setMessage('WhatsApp linked successfully.');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-6 md:p-8">
      <header>
        <h1 className="text-display flex items-center gap-2">
          <MessageCircle className="h-7 w-7 text-[var(--primary)]" />
          WhatsApp HR
        </h1>
        <p className="text-body mt-2 text-[var(--muted-foreground)]">
          Verify your mobile number to use WhatsApp for leave, attendance, and payslip requests.
        </p>
      </header>

      <div className="card space-y-4 border border-[var(--border)] p-5">
        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm font-medium text-[var(--foreground)]">
            Mobile number
          </label>
          <p className="text-xs text-[var(--muted-foreground)]">
            Used to verify WhatsApp HR. Must match your WhatsApp number.
          </p>
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="border-[var(--border)]"
          />
        </div>

        {step === 'code' && (
          <>
            <div className="space-y-2">
              <label htmlFor="code" className="text-sm font-medium text-[var(--foreground)]">
                Verification code
              </label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6-digit code"
                className="border-[var(--border)]"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="externalId" className="text-sm font-medium text-[var(--foreground)]">
                WhatsApp ID (digits only)
              </label>
              <Input
                id="externalId"
                value={externalId}
                onChange={(e) => setExternalId(e.target.value.replace(/\D/g, ''))}
                placeholder="919876543210"
                className="border-[var(--border)]"
              />
            </div>
          </>
        )}

        {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
        {message && (
          <p className="flex items-center gap-2 text-sm text-[var(--primary)]">
            <CheckCircle2 className="h-4 w-4" /> {message}
          </p>
        )}

        <div className="flex gap-3">
          {step === 'phone' ? (
            <Button onClick={startVerify} disabled={loading || !phone.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send code'}
            </Button>
          ) : (
            <Button onClick={confirmVerify} disabled={loading || code.length !== 6 || !externalId}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify & link'}
            </Button>
          )}
          <Link
            href="/employee/profile"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            Back to profile
          </Link>
        </div>
      </div>
    </div>
  );
}
