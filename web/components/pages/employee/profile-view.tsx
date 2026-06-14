"use client"
import React, { useState, useEffect, useCallback } from 'react';
import { User, Phone, MapPin, Heart, Landmark, Loader2, Save, CheckCircle2, XCircle } from 'lucide-react';

/**
 * Employee self-service profile edit page.
 * Employees can update personal details — phone, address, emergency contact, bank, PAN.
 * Cannot change role, department, or work email (HR-only fields).
 *
 * @page /employee/profile (merged into existing profile page as new tab)
 */

interface ProfileData {
  id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  personal_email?: string;
  department?: string;
  designation?: string;
  primary_role?: string;
  employee_id?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  current_address?: string;
  blood_group?: string;
  bank_account_number?: string;
  bank_name?: string;
  ifsc_code?: string;
  pan_number?: string;
}

type TabKey = 'personal' | 'emergency' | 'bank';

export default function ProfileView() {
  const [profile, setProfile] = useState<ProfileData>({});
  const [form, setForm] = useState<ProfileData>({});
  const [activeTab, setActiveTab] = useState<TabKey>('personal');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/employee/profile', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setProfile(data.profile || {});
      setForm(data.profile || {});
    } catch (e) { console.error('[Profile] fetch error:', e); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  function setField(key: keyof ProfileData, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setIsSaving(true); setResult(null);
    const payload: Partial<ProfileData> = {
      phone: form.phone,
      personal_email: form.personal_email,
      emergency_contact_name: form.emergency_contact_name,
      emergency_contact_phone: form.emergency_contact_phone,
      emergency_contact_relationship: form.emergency_contact_relationship,
      current_address: form.current_address,
      blood_group: form.blood_group,
      bank_account_number: form.bank_account_number,
      bank_name: form.bank_name,
      ifsc_code: form.ifsc_code,
      pan_number: form.pan_number,
    };
    try {
      const res = await fetch('/api/employee/profile', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResult({ success: true, message: 'Profile updated successfully.' });
        fetchProfile();
      } else {
        setResult({ success: false, message: data.error || 'Failed to save' });
      }
    } catch { setResult({ success: false, message: 'Network error' }); }
    finally { setIsSaving(false); }
  }

  const tabClass = (t: TabKey) =>
    `flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === t ? 'bg-[var(--accent)] text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)]'}`;

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
    </div>
  );

  return (
    <div className="flex flex-col gap-6 max-w-[800px] mx-auto w-full p-4 md:p-8">
      <header>
        <h1 className="text-display flex items-center gap-3">
          <User className="w-7 h-7 text-[var(--primary)]" /> My Profile
        </h1>
        <p className="text-body mt-2">Update your personal information. Role, department and work email are managed by HR.</p>
      </header>

      {/* Read-only identity */}
      <div className="card p-5 border border-[var(--border)] bg-[var(--muted)]/20 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
        <div><p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">Full Name</p><p className="font-semibold mt-1">{profile.first_name} {profile.last_name}</p></div>
        <div><p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">Work Email</p><p className="font-semibold mt-1 truncate">{profile.email}</p></div>
        <div><p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">Employee ID</p><p className="font-semibold mt-1">{profile.employee_id || '—'}</p></div>
        <div><p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">Role</p><p className="font-semibold mt-1 capitalize">{profile.primary_role}</p></div>
        <div><p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">Department</p><p className="font-semibold mt-1">{profile.department || '—'}</p></div>
        <div><p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">Designation</p><p className="font-semibold mt-1">{profile.designation || '—'}</p></div>
      </div>

      {result && (
        <div className={`card p-4 flex gap-3 border ${result.success ? 'border-[var(--success)]/30 bg-[var(--success)]/5' : 'border-[var(--danger)]/30 bg-[var(--danger)]/5'}`}>
          {result.success ? <CheckCircle2 className="w-5 h-5 text-[var(--success)] shrink-0" /> : <XCircle className="w-5 h-5 text-[var(--danger)] shrink-0" />}
          <p className="text-sm">{result.message}</p>
        </div>
      )}

      <div className="card p-6 shadow-lg space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          <button type="button" className={tabClass('personal')} onClick={() => setActiveTab('personal')}><Phone className="w-4 h-4" /> Personal</button>
          <button type="button" className={tabClass('emergency')} onClick={() => setActiveTab('emergency')}><Heart className="w-4 h-4" /> Emergency</button>
          <button type="button" className={tabClass('bank')} onClick={() => setActiveTab('bank')}><Landmark className="w-4 h-4" /> Bank & Tax</button>
        </div>

        {activeTab === 'personal' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Mobile Phone</label>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Used to verify WhatsApp HR. Must match your WhatsApp number.
                </p>
                <input className="input h-11 w-full" type="tel" autoComplete="tel" value={form.phone || ''} onChange={e => setField('phone', e.target.value)} placeholder="+91 98765 43210" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Personal Email</label>
                <input className="input h-11 w-full" type="email" value={form.personal_email || ''} onChange={e => setField('personal_email', e.target.value)} placeholder="you@gmail.com" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Blood Group</label>
                <select className="input h-11 w-full cursor-pointer" value={form.blood_group || ''} onChange={e => setField('blood_group', e.target.value)}>
                  <option value="">-- Select --</option>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
                <MapPin className="inline w-3.5 h-3.5 mr-1" />Current Address
              </label>
              <textarea className="input w-full min-h-[80px] py-2.5" value={form.current_address || ''} onChange={e => setField('current_address', e.target.value)} placeholder="Full residential address..." />
            </div>
          </div>
        )}

        {activeTab === 'emergency' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Contact Name</label>
                <input className="input h-11 w-full" value={form.emergency_contact_name || ''} onChange={e => setField('emergency_contact_name', e.target.value)} placeholder="Full name" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Contact Phone</label>
                <input className="input h-11 w-full" type="tel" value={form.emergency_contact_phone || ''} onChange={e => setField('emergency_contact_phone', e.target.value)} placeholder="+91 9999999999" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Relationship</label>
                <select className="input h-11 w-full cursor-pointer" value={form.emergency_contact_relationship || ''} onChange={e => setField('emergency_contact_relationship', e.target.value)}>
                  <option value="">-- Select --</option>
                  {['Spouse','Parent','Sibling','Child','Friend','Other'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bank' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Bank Name</label>
                <input className="input h-11 w-full" value={form.bank_name || ''} onChange={e => setField('bank_name', e.target.value)} placeholder="HDFC Bank" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Account Number</label>
                <input className="input h-11 w-full" value={form.bank_account_number || ''} onChange={e => setField('bank_account_number', e.target.value)} placeholder="XXXXXXXXXXXX" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">IFSC Code</label>
                <input className="input h-11 w-full uppercase" value={form.ifsc_code || ''} onChange={e => setField('ifsc_code', e.target.value.toUpperCase())} placeholder="HDFC0001234" maxLength={11} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">PAN Number</label>
                <input className="input h-11 w-full uppercase" value={form.pan_number || ''} onChange={e => setField('pan_number', e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} />
              </div>
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">Bank details are used for salary disbursement. PAN is required for TDS computation.</p>
          </div>
        )}

        <div className="pt-4 border-t border-[var(--border)] flex justify-end">
          <button type="button" onClick={handleSave} disabled={isSaving} className="btn btn-primary min-w-[140px] relative overflow-hidden">
            <span className={isSaving ? 'opacity-0' : 'flex items-center gap-2'}><Save className="w-4 h-4" /> Save Changes</span>
            {isSaving && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>}
          </button>
        </div>
      </div>
    </div>
  );
}
