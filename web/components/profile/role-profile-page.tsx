'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Mail, Phone, MapPin, Shield, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';

type ProfilePayload = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  current_address: string | null;
  gender: string | null;
  department: string | null;
  designation: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
};

type EditableProfile = {
  firstName: string;
  lastName: string;
  phone: string;
  currentAddress: string;
  gender: string;
  department: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
};

const EMPTY_PROFILE: EditableProfile = {
  firstName: '',
  lastName: '',
  phone: '',
  currentAddress: '',
  gender: '',
  department: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelationship: '',
};

function toEditable(profile: ProfilePayload): EditableProfile {
  return {
    firstName: profile.first_name || '',
    lastName: profile.last_name || '',
    phone: profile.phone || '',
    currentAddress: profile.current_address || '',
    gender: profile.gender || '',
    department: profile.department || '',
    emergencyContactName: profile.emergency_contact_name || '',
    emergencyContactPhone: profile.emergency_contact_phone || '',
    emergencyContactRelationship: profile.emergency_contact_relationship || '',
  };
}

export function RoleProfilePage({
  roleLabel,
  homePath,
}: {
  roleLabel: string;
  homePath: string;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [deletingContact, setDeletingContact] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState<string | null>(null);
  const [profile, setProfile] = useState<EditableProfile>(EMPTY_PROFILE);

  const initials = useMemo(() => {
    const first = profile.firstName.trim();
    const last = profile.lastName.trim();
    if (first || last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || 'U';
    }
    return 'U';
  }, [profile.firstName, profile.lastName]);

  const hasEmergencyContact = Boolean(
    profile.emergencyContactName.trim() &&
    profile.emergencyContactPhone.trim() &&
    profile.emergencyContactRelationship.trim()
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadProfile() {
      try {
        const response = await fetch('/api/profile', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.profile) {
          setError(payload.error || 'Failed to load profile.');
          return;
        }

        const source = payload.profile as ProfilePayload;
        setEmail(source.email || '');
        setDesignation(source.designation || null);
        setProfile(toEditable(source));
      } catch (loadError) {
        if ((loadError as Error).name !== 'AbortError') {
          setError('Failed to load profile.');
        }
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();

    return () => controller.abort();
  }, []);

  function updateField(key: keyof EditableProfile, value: string) {
    setProfile((previous) => ({ ...previous, [key]: value }));
    if (error) {
      setError(null);
    }
    if (success) {
      setSuccess(null);
    }
  }

  async function saveProfile() {
    if (saving) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone,
          currentAddress: profile.currentAddress,
          gender: profile.gender,
          department: profile.department,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.profile) {
        setError(payload.error || 'Failed to update profile.');
        return;
      }

      const updated = payload.profile as ProfilePayload;
      setEmail(updated.email || '');
      setDesignation(updated.designation || null);
      setProfile(toEditable(updated));
      setSuccess('Profile updated successfully.');
    } catch {
      setError('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }

  async function addOrUpdateEmergencyContact() {
    if (savingContact) {
      return;
    }

    setSavingContact(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          emergencyContactName: profile.emergencyContactName,
          emergencyContactPhone: profile.emergencyContactPhone,
          emergencyContactRelationship: profile.emergencyContactRelationship,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.profile) {
        setError(payload.error || 'Failed to save emergency contact.');
        return;
      }

      const updated = payload.profile as ProfilePayload;
      setProfile(toEditable(updated));
      setSuccess('Emergency contact saved.');
    } catch {
      setError('Failed to save emergency contact.');
    } finally {
      setSavingContact(false);
    }
  }

  async function deleteEmergencyContact() {
    if (deletingContact) {
      return;
    }

    setDeletingContact(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'DELETE',
        credentials: 'include',
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.profile) {
        setError(payload.error || 'Failed to delete emergency contact.');
        return;
      }

      const updated = payload.profile as ProfilePayload;
      setProfile(toEditable(updated));
      setSuccess('Emergency contact removed.');
    } catch {
      setError('Failed to delete emergency contact.');
    } finally {
      setDeletingContact(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto w-full p-6 md:p-8 space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">{roleLabel}</p>
        <h1 className="text-display">Profile</h1>
        <p className="text-body text-[var(--muted-foreground)]">
          Update your account details and keep emergency contact information accurate.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-[var(--destructive)]/40 bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-[var(--success)]/40 bg-[var(--success)]/10 px-3 py-2 text-sm text-[var(--success)]">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <aside className="card p-6 space-y-4">
          <div className="w-16 h-16 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center text-xl font-bold">
            {initials}
          </div>
          <div className="space-y-1">
            <h2 className="text-h3">{`${profile.firstName} ${profile.lastName}`.trim() || 'User'}</h2>
            <p className="text-sm text-[var(--muted-foreground)]">{designation || roleLabel}</p>
          </div>
          <div className="pt-2 space-y-2 text-sm text-[var(--muted-foreground)]">
            <p className="flex items-center gap-2"><Mail className="w-4 h-4" />{email || 'No email available'}</p>
            <p className="flex items-center gap-2"><Phone className="w-4 h-4" />{profile.phone || 'No phone number'}</p>
            <p className="flex items-center gap-2"><MapPin className="w-4 h-4" />{profile.currentAddress || 'No address on file'}</p>
          </div>
          <a href={homePath} className="btn btn-secondary w-full justify-center">Back to Dashboard</a>
        </aside>

        <section className="card p-6 lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <h3 className="text-h3 flex items-center gap-2"><UserRound className="w-5 h-5 text-[var(--primary)]" />Personal Info</h3>
            <Button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
              {saving ? 'Saving...' : 'Edit & Save'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">First name</label>
              <Input className="input" value={profile.firstName} onChange={(event) => updateField('firstName', event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Last name</label>
              <Input className="input" value={profile.lastName} onChange={(event) => updateField('lastName', event.target.value)} />
            </div>
            <div className="space-y-2">
              <label htmlFor="phone" className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Mobile number</label>
              <p className="text-xs text-[var(--muted-foreground)]">
                Used to verify WhatsApp HR. Must match your WhatsApp number.
              </p>
              <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+91 98765 43210" className="input" value={profile.phone} onChange={(event) => updateField('phone', event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Department</label>
              <Input className="input" value={profile.department} onChange={(event) => updateField('department', event.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Current address</label>
              <Textarea className="input min-h-[90px]" value={profile.currentAddress} onChange={(event) => updateField('currentAddress', event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Gender</label>
              <select
                className="input w-full h-11 bg-[var(--card)]"
                value={profile.gender}
                onChange={(event) => updateField('gender', event.target.value)}
              >
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </section>
      </div>

      <section className="card p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <h3 className="text-h3 flex items-center gap-2"><Shield className="w-5 h-5 text-[var(--primary)]" />Emergency Contact</h3>
          <div className="flex gap-2">
            <Button className="btn btn-primary" onClick={addOrUpdateEmergencyContact} disabled={savingContact}>
              {savingContact ? 'Saving...' : hasEmergencyContact ? 'Edit & Save Contact' : 'Add Contact'}
            </Button>
            <Button className="btn btn-secondary" onClick={deleteEmergencyContact} disabled={deletingContact || !hasEmergencyContact}>
              {deletingContact ? 'Deleting...' : 'Delete Contact'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Name</label>
            <Input className="input" value={profile.emergencyContactName} onChange={(event) => updateField('emergencyContactName', event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Phone</label>
            <Input className="input" value={profile.emergencyContactPhone} onChange={(event) => updateField('emergencyContactPhone', event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Relationship</label>
            <Input className="input" value={profile.emergencyContactRelationship} onChange={(event) => updateField('emergencyContactRelationship', event.target.value)} />
          </div>
        </div>
      </section>
    </div>
  );
}
