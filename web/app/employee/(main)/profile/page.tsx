'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, CheckCircle, Phone, Building2, MapPin, Eye, EyeOff } from 'lucide-react';

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
  // Emergency contact
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  // Bank details
  bank_name: string | null;
  bank_account_number: string | null;
  ifsc_code: string | null;
  // Address
  current_address: string | null;
}

interface LeaveBalance {
  leave_type: string;
  annual_entitlement: number;
  used_days: number;
  pending_days: number;
  remaining: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function maskValue(val: string | null): string {
  if (!val) return '\u2014';
  if (val.length <= 4) return val;
  return '\u2022'.repeat(val.length - 4) + val.slice(-4);
}

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500';

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

  // Emergency contact edit state
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('');

  // Bank details edit state
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  // Address edit state
  const [currentAddress, setCurrentAddress] = useState('');

  // Bank details visibility toggle
  const [showBankDetails, setShowBankDetails] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, balancesRes] = await Promise.all([
          fetch('/api/employees/me', { credentials: 'include' }),
          fetch('/api/leaves/balances', { credentials: 'include' }),
        ]);
        if (profileRes.ok) {
          const p = await profileRes.json();
          setProfile(p);
          setPhone(p.phone ?? '');
          setDepartment(p.department ?? '');
          setDesignation(p.designation ?? '');
          // New fields
          setEmergencyName(p.emergency_contact_name ?? '');
          setEmergencyPhone(p.emergency_contact_phone ?? '');
          setEmergencyRelationship(p.emergency_contact_relationship ?? '');
          setBankName(p.bank_name ?? '');
          setBankAccount(p.bank_account_number ?? '');
          setIfscCode(p.ifsc_code ?? '');
          setCurrentAddress(p.current_address ?? '');
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

  function startEditing() {
    if (profile) {
      setPhone(profile.phone ?? '');
      setDepartment(profile.department ?? '');
      setDesignation(profile.designation ?? '');
      setEmergencyName(profile.emergency_contact_name ?? '');
      setEmergencyPhone(profile.emergency_contact_phone ?? '');
      setEmergencyRelationship(profile.emergency_contact_relationship ?? '');
      setBankName(profile.bank_name ?? '');
      setBankAccount(profile.bank_account_number ?? '');
      setIfscCode(profile.ifsc_code ?? '');
      setCurrentAddress(profile.current_address ?? '');
    }
    setSaveError('');
    setSaveSuccess('');
    setEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveError('');
    setSaveSuccess('');
    setSaving(true);
    try {
      const res = await fetch('/api/employees/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          phone: phone || null,
          emergency_contact_name: emergencyName || null,
          emergency_contact_phone: emergencyPhone || null,
          emergency_contact_relationship: emergencyRelationship || null,
          bank_name: bankName || null,
          bank_account_number: bankAccount || null,
          ifsc_code: ifscCode || null,
          current_address: currentAddress || null,
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
          <Button variant="outline" onClick={startEditing} className="gap-2">
            <Pencil className="w-4 h-4" />
            Edit Profile
          </Button>
        )}
      </div>

      {saveSuccess && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
          {saveSuccess}
        </div>
      )}

      {loadingProfile ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">Loading profile...</CardContent>
        </Card>
      ) : profile ? (
        <>
          {/* ---- Main Profile Card ---- */}
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
                <form onSubmit={handleSave} className="mt-6 pt-6 border-t border-border space-y-6">
                  {saveError && (
                    <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                      {saveError}
                    </div>
                  )}

                  {/* -- Basic Info -- */}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Basic Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Phone</label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className={inputClass}
                          placeholder="+91 98765 43210"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Department</label>
                        <div className="px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm text-muted-foreground">
                          {department || 'Not assigned'}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">Contact HR to update</p>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Designation</label>
                        <div className="px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm text-muted-foreground">
                          {designation || 'Not assigned'}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">Contact HR to update</p>
                      </div>
                    </div>
                  </div>

                  {/* -- Emergency Contact -- */}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      Emergency Contact
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Contact Name</label>
                        <input
                          type="text"
                          value={emergencyName}
                          onChange={(e) => setEmergencyName(e.target.value)}
                          className={inputClass}
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Contact Phone</label>
                        <input
                          type="tel"
                          value={emergencyPhone}
                          onChange={(e) => setEmergencyPhone(e.target.value)}
                          className={inputClass}
                          placeholder="+91 98765 43210"
                        />
                      </div>
                      <div className="col-span-2">
                        <label htmlFor="emergency-relationship" className="block text-xs font-medium text-muted-foreground mb-1">Relationship</label>
                        <select
                          id="emergency-relationship"
                          value={emergencyRelationship}
                          onChange={(e) => setEmergencyRelationship(e.target.value)}
                          className={inputClass + ' appearance-none cursor-pointer'}
                          aria-label="Emergency contact relationship"
                        >
                          <option value="">Select relationship</option>
                          <option value="Spouse">Spouse</option>
                          <option value="Parent">Parent</option>
                          <option value="Sibling">Sibling</option>
                          <option value="Child">Child</option>
                          <option value="Friend">Friend</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* -- Bank Details -- */}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      Bank Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Bank Name</label>
                        <input
                          type="text"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          className={inputClass}
                          placeholder="State Bank of India"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">IFSC Code</label>
                        <input
                          type="text"
                          value={ifscCode}
                          onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                          className={inputClass}
                          placeholder="SBIN0001234"
                          maxLength={11}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Account Number</label>
                        <input
                          type="text"
                          value={bankAccount}
                          onChange={(e) => setBankAccount(e.target.value)}
                          className={inputClass}
                          placeholder="1234567890123456"
                          maxLength={20}
                        />
                      </div>
                    </div>
                  </div>

                  {/* -- Address -- */}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      Current Address
                    </h3>
                    <textarea
                      value={currentAddress}
                      onChange={(e) => setCurrentAddress(e.target.value)}
                      className={inputClass + ' resize-none'}
                      placeholder="123 Main Street, Apt 4B, City, State, PIN"
                      rows={3}
                      maxLength={500}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button type="submit" disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
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
                    { label: 'Phone', value: profile.phone ?? '\u2014' },
                    { label: 'Date of Joining', value: formatDate(profile.date_of_joining) },
                    { label: 'Reporting Manager', value: profile.manager ? `${profile.manager.first_name} ${profile.manager.last_name}` : '\u2014' },
                    { label: 'Gender', value: profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1).toLowerCase() : '\u2014' },
                    { label: 'Department', value: profile.department ?? '\u2014' },
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

          {/* ---- Emergency Contact Card ---- */}
          {!editing && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  Emergency Contact
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile.emergency_contact_name ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Name</p>
                      <p className="text-sm text-foreground mt-0.5 font-medium">{profile.emergency_contact_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Phone</p>
                      <p className="text-sm text-foreground mt-0.5 font-medium">{profile.emergency_contact_phone ?? '\u2014'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Relationship</p>
                      <p className="text-sm text-foreground mt-0.5 font-medium">{profile.emergency_contact_relationship ?? '\u2014'}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-2">
                    No emergency contact added.{' '}
                    <button type="button" onClick={startEditing} className="text-primary hover:underline font-medium">
                      Add one now
                    </button>
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* ---- Bank Details Card ---- */}
          {!editing && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    Bank Details
                  </CardTitle>
                  {profile.bank_account_number && (
                    <button
                      type="button"
                      onClick={() => setShowBankDetails((v) => !v)}
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showBankDetails ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          Hide
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          Show
                        </>
                      )}
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {profile.bank_name || profile.bank_account_number ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Bank Name</p>
                      <p className="text-sm text-foreground mt-0.5 font-medium">{profile.bank_name ?? '\u2014'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">IFSC Code</p>
                      <p className="text-sm text-foreground mt-0.5 font-medium font-mono">
                        {showBankDetails ? (profile.ifsc_code ?? '\u2014') : maskValue(profile.ifsc_code)}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Account Number</p>
                      <p className="text-sm text-foreground mt-0.5 font-medium font-mono">
                        {showBankDetails ? (profile.bank_account_number ?? '\u2014') : maskValue(profile.bank_account_number)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-2">
                    No bank details added.{' '}
                    <button type="button" onClick={startEditing} className="text-primary hover:underline font-medium">
                      Add them now
                    </button>
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* ---- Address Card ---- */}
          {!editing && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  Current Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile.current_address ? (
                  <p className="text-sm text-foreground whitespace-pre-wrap">{profile.current_address}</p>
                ) : (
                  <p className="text-sm text-muted-foreground py-2">
                    No address added.{' '}
                    <button type="button" onClick={startEditing} className="text-primary hover:underline font-medium">
                      Add it now
                    </button>
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </>
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
            <div className="text-sm text-muted-foreground py-4 text-center">Loading balances...</div>
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
