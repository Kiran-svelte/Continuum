'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Phone, MapPin, Siren, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type OnboardingProfile = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  gender: string | null;
  current_address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
};

const REQUIRED_FIELDS: Array<keyof Pick<
  OnboardingProfile,
  'phone' | 'current_address'
>> = [
  'phone',
  'current_address',
];

export default function OnboardingView() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch('/api/employee/onboarding', { credentials: 'include' });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok || !payload.profile) {
          setError(payload.error || 'Unable to load employee onboarding details.');
          return;
        }

        setProfile(payload.profile as OnboardingProfile);
      } catch {
        setError('Unable to load employee onboarding details.');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const missingCount = useMemo(() => {
    if (!profile) {
      return REQUIRED_FIELDS.length;
    }

    return REQUIRED_FIELDS.filter((field) => !String(profile[field] ?? '').trim()).length;
  }, [profile]);

  const canSubmit = Boolean(profile) && missingCount === 0 && !submitting;

  const updateField = (key: keyof OnboardingProfile, value: string) => {
    setProfile((prev) => {
      if (!prev) {
        return prev;
      }
      return { ...prev, [key]: value };
    });
    if (error) {
      setError(null);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/employee/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          firstName: profile.first_name,
          lastName: profile.last_name,
          phone: profile.phone,
          gender: profile.gender,
          currentAddress: profile.current_address,
          emergencyContactName: profile.emergency_contact_name,
          emergencyContactPhone: profile.emergency_contact_phone,
          emergencyContactRelationship: profile.emergency_contact_relationship,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error || 'Unable to complete onboarding.');
        return;
      }

      router.push('/employee/welcome');
    } catch {
      setError('Unable to complete onboarding.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-6">
        <div className="card p-8 text-center space-y-4 max-w-md w-full">
          <Loader2 className="w-10 h-10 text-[var(--primary)] animate-spin mx-auto" />
          <p className="text-sm text-[var(--muted-foreground)]">Loading employee onboarding...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-6">
        <div className="card p-8 text-center space-y-4 max-w-md w-full">
          <h1 className="text-h3">Employee onboarding unavailable</h1>
          <p className="text-sm text-[var(--muted-foreground)]">{error || 'Please sign in again and retry.'}</p>
          <Button
            className="btn btn-primary"
            onClick={async () => {
              // Sign out first to clear the session cookie, then redirect to sign-in.
              // Without this, the middleware immediately redirects back here (loop).
              try {
                await fetch('/api/auth/sign-out', { method: 'POST', credentials: 'include' });
              } catch {
                // Best-effort — proceed to sign-in even if sign-out call fails.
              }
              router.push('/sign-in');
            }}
          >
            Return to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-6 md:p-10 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(circle_at_15%_20%,var(--primary)_0%,transparent_40%),radial-gradient(circle_at_80%_10%,var(--success)_0%,transparent_35%)]" />

      <div className="max-w-3xl mx-auto relative z-10 space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Employee onboarding</p>
          <h1 className="text-display">Set up your profile</h1>
          <p className="text-body text-[var(--muted-foreground)]">
            Only personal and contact essentials are required now. Payroll and additional profile details can be added later.
          </p>
        </header>

        <form onSubmit={submit} className="card p-6 md:p-8 space-y-8">
          <section className="space-y-4">
            <h2 className="text-h3">1. Personal basics</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">First name</label>
                <Input
                  className="input h-11"
                  value={profile.first_name}
                  onChange={(event) => updateField('first_name', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Last name</label>
                <Input
                  className="input h-11"
                  value={profile.last_name}
                  onChange={(event) => updateField('last_name', event.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Work email</label>
                <Input className="input h-11" value={profile.email} disabled />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Gender (optional)</label>
                <select
                  value={profile.gender || ''}
                  onChange={(event) => updateField('gender', event.target.value)}
                  className="input h-11 w-full bg-[var(--card)]"
                >
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-h3">2. Contact and emergency</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs uppercase tracking-wide text-[var(--muted-foreground)] flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Phone number
                </label>
                <Input
                  className="input h-11"
                  value={profile.phone || ''}
                  onChange={(event) => updateField('phone', event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs uppercase tracking-wide text-[var(--muted-foreground)] flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Current address
                </label>
                <Input
                  className="input h-11"
                  value={profile.current_address || ''}
                  onChange={(event) => updateField('current_address', event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-[var(--muted-foreground)] flex items-center gap-2">
                  <Siren className="w-4 h-4" /> Emergency contact name (optional)
                </label>
                <Input
                  className="input h-11"
                  value={profile.emergency_contact_name || ''}
                  onChange={(event) => updateField('emergency_contact_name', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Emergency contact phone (optional)</label>
                <Input
                  className="input h-11"
                  value={profile.emergency_contact_phone || ''}
                  onChange={(event) => updateField('emergency_contact_phone', event.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Relationship (optional)</label>
                <Input
                  className="input h-11"
                  value={profile.emergency_contact_relationship || ''}
                  onChange={(event) => updateField('emergency_contact_relationship', event.target.value)}
                />
              </div>
            </div>
          </section>

          {error && (
            <p className="rounded-lg border border-[var(--destructive)]/40 bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">
              {error}
            </p>
          )}

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-2">
            <p className="text-xs text-[var(--muted-foreground)]">
              Required fields remaining: {missingCount}
            </p>
            <Button type="submit" className="btn btn-primary min-w-44" disabled={!canSubmit}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
