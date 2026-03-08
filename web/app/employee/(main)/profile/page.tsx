'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  primary_role: string;
  department: string | null;
  designation: string | null;
  status: string;
  date_of_joining: string;
  gender: string;
  manager: { first_name: string; last_name: string; designation: string | null } | null;
}

interface LeaveBalance {
  leave_type: string;
  annual_entitlement: number;
  used_days: number;
  pending_days: number;
  remaining: number;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingBalances, setLoadingBalances] = useState(true);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, balancesRes] = await Promise.all([
          fetch('/api/employees/me'),
          fetch('/api/leaves/balances'),
        ]);
        if (profileRes.ok) {
          const p = await profileRes.json();
          setProfile(p);
          setPhone(p.phone ?? '');
          setDepartment(p.department ?? '');
          setDesignation(p.designation ?? '');
        }
        if (balancesRes.ok) {
          const b = await balancesRes.json();
          setBalances(b.balances ?? []);
        }
      } finally {
        setLoadingProfile(false);
        setLoadingBalances(false);
      }
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveError('');
    setSaveSuccess('');
    setSaving(true);
    try {
      const res = await fetch('/api/employees/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone || null,
          department: department || null,
          designation: designation || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSaveError(json.error ?? 'Failed to update profile');
        return;
      }
      setProfile((prev) => prev ? { ...prev, ...json } : prev);
      setSaveSuccess('Profile updated successfully.');
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground mt-1">Your employment details and leave summary</p>
        </div>
        {!editing && profile && (
          <Button variant="outline" onClick={() => setEditing(true)}>
            ✏️ Edit Profile
          </Button>
        )}
      </div>

      {saveSuccess && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-300">
          ✓ {saveSuccess}
        </div>
      )}

      {loadingProfile ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">Loading profile…</CardContent>
        </Card>
      ) : profile ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-xl font-bold text-primary">
                {profile.first_name[0]}{profile.last_name[0]}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {profile.first_name} {profile.last_name}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {profile.designation ?? 'No designation set'} · {profile.department ?? 'No department'}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="success">{profile.status}</Badge>
                  <Badge variant="info">{profile.primary_role}</Badge>
                </div>
              </div>
            </div>

            {editing ? (
              <form onSubmit={handleSave} className="mt-6 pt-6 border-t border-border space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Edit Profile</h3>
                {saveError && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                    {saveError}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Phone</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Department</label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      placeholder="Engineering"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Designation</label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      placeholder="Senior Software Engineer"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving…' : 'Save Changes'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setEditing(false); setSaveError(''); }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-border">
                {[
                  { label: 'Email', value: profile.email },
                  { label: 'Phone', value: profile.phone ?? '—' },
                  { label: 'Date of Joining', value: formatDate(profile.date_of_joining) },
                  { label: 'Reporting Manager', value: profile.manager ? `${profile.manager.first_name} ${profile.manager.last_name}` : '—' },
                  { label: 'Gender', value: profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1).toLowerCase() : '—' },
                  { label: 'Department', value: profile.department ?? '—' },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{item.label}</p>
                    <p className="text-sm text-foreground mt-0.5 font-medium">{item.value}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Could not load profile.
          </CardContent>
        </Card>
      )}

      {/* Leave Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Balance Summary ({new Date().getFullYear()})</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingBalances && (
            <div className="text-sm text-muted-foreground py-4 text-center">Loading balances…</div>
          )}
          {!loadingBalances && balances.length === 0 && (
            <div className="text-sm text-muted-foreground py-4 text-center">No leave balances found.</div>
          )}
          {!loadingBalances && balances.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Leave Type</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Entitled</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Used</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Pending</th>
                    <th className="text-right py-2 pl-2 text-muted-foreground font-medium">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((b) => (
                    <tr key={b.leave_type} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-4 font-medium text-foreground">{b.leave_type}</td>
                      <td className="py-2 px-2 text-right text-muted-foreground">{b.annual_entitlement}</td>
                      <td className="py-2 px-2 text-right text-muted-foreground">{b.used_days}</td>
                      <td className="py-2 px-2 text-right text-yellow-600">{b.pending_days}</td>
                      <td className="py-2 pl-2 text-right font-semibold text-primary">{b.remaining}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
