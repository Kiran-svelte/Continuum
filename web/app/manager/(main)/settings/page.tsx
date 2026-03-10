'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bell,
  BellOff,
  CheckCircle,
  Palette,
  Volume2,
  VolumeX,
  Globe,
  Shield,
  Mail,
  MailX,
  Smartphone,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { getFirebaseAuth, firebaseSendPasswordResetEmail } from '@/lib/firebase';

interface Profile {
  first_name: string;
  last_name: string;
  email: string;
  department: string | null;
  designation: string | null;
  phone: string | null;
  date_of_joining: string | null;
  primary_role: string;
  timezone?: string | null;
}

/** Shape returned / accepted by the notification preferences API */
interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  reminderTiming: unknown;
}

const defaultPreferences: NotificationPreferences = {
  emailEnabled: true,
  pushEnabled: true,
  inAppEnabled: true,
  reminderTiming: null,
};

function ToggleSwitch({
  value,
  onChange,
  label,
  disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!value)}
      className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${value ? 'bg-primary' : 'bg-muted'}`}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 ${
          value ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function ManagerSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // DB-backed notification preferences
  const [prefs, setPrefs] = useState<NotificationPreferences>(defaultPreferences);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [savedField, setSavedField] = useState<string | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Local-only preferences (not DB-backed)
  const [soundEnabled, setSoundEnabled] = useState(true);

  const showFeedback = useCallback((type: 'success' | 'error', message: string, durationMs = 4000) => {
    setFeedback({ type, message });
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setFeedback(null), durationMs);
  }, []);

  // Load profile + notification preferences on mount
  const loadAll = useCallback(async () => {
    setLoadError(null);
    try {
      const [profileRes, prefsRes] = await Promise.all([
        fetch('/api/auth/me', { credentials: 'include' }),
        fetch('/api/notifications/preferences', { credentials: 'include' }),
      ]);

      const profileData = await profileRes.json();
      if (!profileData.error) setProfile(profileData);

      if (prefsRes.ok) {
        const data = await prefsRes.json();
        if (data.preferences) {
          setPrefs(data.preferences);
        }
      }
    } catch {
      setLoadError('Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  /**
   * Toggle a single notification preference and auto-save via PUT.
   * Optimistic update with rollback on error.
   */
  const handleToggle = useCallback(
    async (key: 'emailEnabled' | 'pushEnabled' | 'inAppEnabled', value: boolean) => {
      const previous = prefs[key];

      // Optimistic update
      setPrefs((prev) => ({ ...prev, [key]: value }));
      setSavingField(key);
      setSavedField(null);

      try {
        const res = await fetch('/api/notifications/preferences', {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [key]: value }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Save failed (${res.status})`);
        }

        const data = await res.json();
        if (data.preferences) {
          setPrefs(data.preferences);
        }

        setSavingField(null);
        setSavedField(key);

        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => {
          setSavedField((prev) => (prev === key ? null : prev));
        }, 2000);
      } catch {
        setPrefs((prev) => ({ ...prev, [key]: previous }));
        setSavingField(null);
        showFeedback('error', 'Failed to save preference. Please try again.');
      }
    },
    [prefs, showFeedback],
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
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

  if (loadError && !profile) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manager Settings</h1>
          <p className="text-muted-foreground mt-1">Customize your experience and team preferences</p>
        </div>
        <div className="rounded-xl px-4 py-3 text-sm font-medium bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{loadError}</span>
          <button
            type="button"
            onClick={loadAll}
            className="ml-2 text-sm underline hover:no-underline shrink-0"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const notificationItems: Array<{
    key: 'emailEnabled' | 'pushEnabled' | 'inAppEnabled';
    label: string;
    description: string;
    iconOn: typeof Mail;
    iconOff: typeof MailX;
  }> = [
    {
      key: 'emailEnabled',
      label: 'Email Notifications',
      description: 'Receive team updates via email',
      iconOn: Mail,
      iconOff: MailX,
    },
    {
      key: 'pushEnabled',
      label: 'Push Notifications',
      description: 'Get notified about team activities',
      iconOn: Bell,
      iconOff: BellOff,
    },
    {
      key: 'inAppEnabled',
      label: 'In-App Notifications',
      description: 'See alerts within the application',
      iconOn: Smartphone,
      iconOff: Smartphone,
    },
  ];

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manager Settings</h1>
          <p className="text-muted-foreground mt-1">Customize your experience and team preferences</p>
        </div>
        {feedback && (
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-lg animate-fade-in ${
              feedback.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">{feedback.message}</span>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 stagger">
        {/* Appearance */}
        <Card className="animate-slide-up bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
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

        {/* Team Notifications -- DB-backed */}
        <Card className="animate-slide-up bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Manage your notification preferences</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {notificationItems.map(({ key, label, description, iconOn: IconOn, iconOff: IconOff }) => {
              const value = prefs[key];
              const isSaving = savingField === key;
              const isSaved = savedField === key;

              return (
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
                  <div className="flex items-center gap-2">
                    {isSaving && (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                    {isSaved && !isSaving && (
                      <span className="text-xs text-green-500 dark:text-green-400 font-medium animate-fade-in">
                        Saved
                      </span>
                    )}
                    <ToggleSwitch
                      value={value}
                      onChange={(v) => handleToggle(key, v)}
                      label={label}
                      disabled={isSaving}
                    />
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground pt-2">
              Changes are saved automatically when you toggle a setting.
            </p>
          </CardContent>
        </Card>

        {/* Sound & Accessibility */}
        <Card className="animate-slide-up bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <CardTitle>Sound & Accessibility</CardTitle>
                <CardDescription>Configure audio and display settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                {soundEnabled ? (
                  <Volume2 className="w-5 h-5 text-primary" />
                ) : (
                  <VolumeX className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">Sound Alerts</p>
                  <p className="text-xs text-muted-foreground">Play sound for notifications</p>
                </div>
              </div>
              <ToggleSwitch value={soundEnabled} onChange={setSoundEnabled} label="Sound Alerts" />
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Timezone</p>
                  <p className="text-xs text-muted-foreground">{profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="animate-slide-up bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <CardTitle>Security</CardTitle>
                <CardDescription>Manage your account security</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <Button variant="outline" className="justify-start gap-3 h-auto py-4" onClick={async () => {
                try {
                  const auth = getFirebaseAuth();
                  const user = auth.currentUser;
                  if (!user?.email) {
                    showFeedback('error', 'Unable to determine your email address. Please sign in again.');
                    return;
                  }
                  await firebaseSendPasswordResetEmail(user.email);
                  showFeedback('success', 'Password reset email sent! Check your inbox.', 5000);
                } catch {
                  showFeedback('error', 'Failed to send password reset email. Please try again.');
                }
              }}>
                <Shield className="w-5 h-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="font-medium">Change Password</p>
                  <p className="text-xs text-muted-foreground">Update your password</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
