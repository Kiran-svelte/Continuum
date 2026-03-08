'use client';

import { useState, useEffect } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bell,
  BellOff,
  CheckCircle,
  Palette,
  User,
  Globe,
  Shield,
  Smartphone,
  Mail,
  MailX,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { getFirebaseAuth, firebaseSendPasswordResetEmail } from '@/lib/firebase';

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
        value ? 'bg-primary' : 'bg-muted'
      }`}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 ${
          value ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [language, setLanguage] = useState('en');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    const savedPush = localStorage.getItem('continuum-push-notifications');
    const savedEmail = localStorage.getItem('continuum-email-notifications');
    const savedSound = localStorage.getItem('continuum-sound');
    const savedLanguage = localStorage.getItem('continuum-language');

    if (savedPush !== null) setPushNotifications(savedPush === 'true');
    if (savedEmail !== null) setEmailNotifications(savedEmail === 'true');
    if (savedSound !== null) setSoundEnabled(savedSound === 'true');
    if (savedLanguage) setLanguage(savedLanguage);
  }, []);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (!data.error) setProfile(data);
      })
      .catch(() => {});
  }, []);

  const handleSavePreferences = async () => {
    setSaving(true);
    localStorage.setItem('continuum-push-notifications', String(pushNotifications));
    localStorage.setItem('continuum-email-notifications', String(emailNotifications));
    localStorage.setItem('continuum-sound', String(soundEnabled));
    localStorage.setItem('continuum-language', language);

    setSaving(false);
    setSaveSuccess('Settings saved successfully!');
    setTimeout(() => setSaveSuccess(''), 3000);
  };

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Customize your experience</p>
        </div>
        {saveSuccess && (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg animate-fade-in">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{saveSuccess}</span>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 stagger">
        {/* Appearance */}
        <Card className="animate-slide-up bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Palette className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Choose your preferred theme</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-3 block">Color Theme</label>
              <ThemeToggle variant="button" />
            </div>
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Your theme preference is saved automatically and persists across sessions.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Profile Settings (placeholder) */}
        <Card className="animate-slide-up bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <User className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Manage your personal information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Display Name</p>
                <p className="text-sm font-medium text-foreground">{profile ? `${profile.first_name} ${profile.last_name}` : '--'}</p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Email</p>
                <p className="text-sm font-medium text-foreground">{profile?.email || '--'}</p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Department</p>
                <p className="text-sm font-medium text-foreground">{profile?.department || '--'}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Contact HR to update your profile information.
            </p>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="animate-slide-up bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Bell className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Manage your notification preferences</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                key: 'push',
                label: 'Push Notifications',
                description: 'Get notified about leave approvals and updates',
                value: pushNotifications,
                onChange: setPushNotifications,
                iconOn: Bell,
                iconOff: BellOff,
              },
              {
                key: 'email',
                label: 'Email Notifications',
                description: 'Receive updates and reminders via email',
                value: emailNotifications,
                onChange: setEmailNotifications,
                iconOn: Mail,
                iconOff: MailX,
              },
              {
                key: 'sound',
                label: 'Sound Alerts',
                description: 'Play a sound for incoming notifications',
                value: soundEnabled,
                onChange: setSoundEnabled,
                iconOn: Volume2,
                iconOff: VolumeX,
              },
            ].map(({ key, label, description, value, onChange, iconOn: IconOn, iconOff: IconOff }) => (
              <div
                key={key}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {value ? (
                    <IconOn className="w-5 h-5 text-primary" />
                  ) : (
                    <IconOff className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                </div>
                <ToggleSwitch value={value} onChange={onChange} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Language & Region */}
        <Card className="animate-slide-up bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Globe className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <CardTitle>Language & Region</CardTitle>
                <CardDescription>Set your preferred language and timezone</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Display Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="ta">Tamil</option>
                <option value="te">Telugu</option>
                <option value="kn">Kannada</option>
                <option value="mr">Marathi</option>
                <option value="bn">Bengali</option>
              </select>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Timezone</p>
                  <p className="text-xs text-muted-foreground">{profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 animate-slide-up">
        <Button
          onClick={handleSavePreferences}
          disabled={saving}
          className="gap-2 px-6"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Save Preferences
            </>
          )}
        </Button>
      </div>

      {/* Security Section */}
      <Card className="animate-slide-up bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <Shield className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage your account security settings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Button variant="outline" className="justify-start gap-3 h-auto py-4" onClick={async () => {
              try {
                const auth = getFirebaseAuth();
                const user = auth.currentUser;
                if (!user?.email) {
                  alert('Unable to determine your email address. Please sign in again.');
                  return;
                }
                await firebaseSendPasswordResetEmail(user.email);
                setSaveSuccess('Password reset email sent! Check your inbox.');
                setTimeout(() => setSaveSuccess(''), 5000);
              } catch {
                alert('Failed to send password reset email. Please try again.');
              }
            }}>
              <Shield className="w-5 h-5 text-muted-foreground" />
              <div className="text-left">
                <p className="font-medium">Change Password</p>
                <p className="text-xs text-muted-foreground">Update your password</p>
              </div>
            </Button>
            <Button variant="outline" className="justify-start gap-3 h-auto py-4" onClick={() => {
              alert('Two-factor authentication setup will be available in a future update.');
            }}>
              <Smartphone className="w-5 h-5 text-muted-foreground" />
              <div className="text-left">
                <p className="font-medium">Two-Factor Auth</p>
                <p className="text-xs text-muted-foreground">Add extra security</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
