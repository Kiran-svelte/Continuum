'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { FadeIn, StaggerContainer, AmbientBackground } from '@/components/motion';
import { PageHeader } from '@/components/page-header';
import { GlassPanel } from '@/components/glass-panel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bell,
  BellOff,
  CheckCircle,
  AlertCircle,
  Palette,
  User,
  Shield,
  Mail,
  MailX,
  Settings,
  Smartphone,
  Loader2,
} from 'lucide-react';
import { supabaseGetUser, supabaseSendPasswordResetEmail } from '@/lib/supabase';

interface Profile {
  first_name: string;
  last_name: string;
  email: string;
  department: string | null;
  designation: string | null;
  phone: string | null;
  date_of_joining: string | null;
  primary_role: string;
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
      aria-checked={value ? 'true' : 'false'}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!value)}
      className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${value ? 'bg-primary' : 'bg-white/5'}`}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 ${
          value ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function SettingsLoadingSkeleton() {
  return (
    <div className="p-4 sm:p-8 pb-32 max-w-4xl mx-auto">
      <AmbientBackground />
      <div className="space-y-10">
        {/* Header skeleton */}
        <div>
          <Skeleton className="h-8 w-32 mb-2 bg-white/10" />
          <Skeleton className="h-4 w-64 bg-white/10" />
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Appearance card skeleton */}
          <div className="glass-panel rounded-2xl border border-white/10 p-6 space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-10 h-10 rounded-lg bg-white/10" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-24 bg-white/10" />
                <Skeleton className="h-3 w-40 bg-white/10" />
              </div>
            </div>
            <Skeleton className="h-10 w-full bg-white/10" />
            <Skeleton className="h-3 w-56 bg-white/10" />
          </div>

          {/* Profile card skeleton */}
          <div className="glass-panel rounded-2xl border border-white/10 p-6 space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-10 h-10 rounded-lg bg-white/10" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-16 bg-white/10" />
                <Skeleton className="h-3 w-48 bg-white/10" />
              </div>
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-xl bg-black/20 space-y-2">
                <Skeleton className="h-3 w-20 bg-white/10" />
                <Skeleton className="h-4 w-36 bg-white/10" />
              </div>
            ))}
          </div>

          {/* Notifications card skeleton */}
          <div className="glass-panel rounded-2xl border border-white/10 p-6 space-y-4 md:col-span-2">
            <div className="flex items-center gap-4">
              <Skeleton className="w-10 h-10 rounded-lg bg-white/10" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-28 bg-white/10" />
                <Skeleton className="h-3 w-52 bg-white/10" />
              </div>
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-black/20">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-6 h-6 rounded-md bg-white/10" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32 bg-white/10" />
                    <Skeleton className="h-3 w-48 bg-white/10" />
                  </div>
                </div>
                <Skeleton className="h-6 w-12 rounded-full bg-white/10" />
              </div>
            ))}
          </div>
        </div>

        {/* Security card skeleton */}
        <div className="glass-panel rounded-2xl border border-white/10 p-6 space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-10 h-10 rounded-lg bg-white/10" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-20 bg-white/10" />
              <Skeleton className="h-3 w-48 bg-white/10" />
            </div>
          </div>
          <Skeleton className="w-full h-16 bg-white/10" />
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Notification preferences state
  const [prefs, setPrefs] = useState<NotificationPreferences>(defaultPreferences);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [savedField, setSavedField] = useState<string | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFeedback = useCallback((type: 'success' | 'error', message: string, durationMs = 4000) => {
    setFeedback({ type, message });
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setFeedback(null), durationMs);
  }, []);

  // Load profile and notification preferences on mount
  const loadSettingsData = useCallback(async () => {
    setSettingsError(null);
    try {
      const [profileRes, prefsRes] = await Promise.all([
        fetch('/api/auth/me', { credentials: 'include' }),
        fetch('/api/notifications/preferences', { credentials: 'include' }),
      ]);

      const profileData = await profileRes.json();
      if (!profileData.error) {
        setProfile(profileData);
      }

      if (prefsRes.ok) {
        const data = await prefsRes.json();
        if (data.preferences) {
          setPrefs(data.preferences);
        }
      } else if (prefsRes.status !== 401) {
        setSettingsError('Failed to load notification preferences.');
      }
    } catch (err) {
      console.error('Failed to load settings data:', err);
      setSettingsError('Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettingsData();
  }, [loadSettingsData]);

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

        // Clear "Saved" indicator after 2 seconds
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => {
          setSavedField((prev) => (prev === key ? null : prev));
        }, 2000);
      } catch {
        // Revert optimistic update
        setPrefs((prev) => ({ ...prev, [key]: previous }));
        setSavingField(null);
        showFeedback('error', 'Failed to save preference. Please try again.');
      }
    },
    [prefs, showFeedback],
  );

  if (loading) {
    return <SettingsLoadingSkeleton />;
  }

  if (settingsError && !profile) {
    return (
      <div className="p-4 sm:p-8 pb-32 max-w-4xl mx-auto">
        <AmbientBackground />
        <div className="space-y-8">
          <PageHeader title="Settings" description="Manage your preferences" icon={<Settings className="w-6 h-6 text-primary" />} />
          <div className="glass-panel p-6 rounded-2xl border border-red-500/30 text-red-300/90 flex items-center gap-4">
            <AlertCircle className="w-6 h-6" />
            <span className="flex-1">{settingsError}</span>
            <Button
              type="button"
              onClick={loadSettingsData}
              className="ml-2 text-sm underline hover:no-underline shrink-0 bg-red-500/20 hover:bg-red-500/30 px-3 py-1 rounded-md"
            >
              Retry
            </Button>
          </div>
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
      description: 'Receive updates and reminders via email',
      iconOn: Mail,
      iconOff: MailX,
    },
    {
      key: 'pushEnabled',
      label: 'Push Notifications',
      description: 'Get notified about leave approvals and updates',
      iconOn: Bell,
      iconOff: BellOff,
    },
    {
      key: 'inAppEnabled',
      label: 'In-App Notifications',
      description: 'See notification alerts within the application',
      iconOn: Smartphone,
      iconOff: Smartphone,
    },
  ];

  return (
    <div className="p-4 sm:p-8 pb-32 max-w-4xl mx-auto">
      <AmbientBackground />
      <StaggerContainer className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Settings"
          description="Manage your preferences"
          icon={<Settings className="w-6 h-6 text-primary" />}
          action={
            feedback ? (
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  feedback.type === 'success'
                    ? 'bg-green-500/80 border border-green-400/50 text-white'
                    : 'bg-red-500/80 border border-red-400/50 text-white'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <span className="text-sm font-medium">{feedback.message}</span>
              </div>
            ) : undefined
          }
        />

        <div className="grid gap-8 md:grid-cols-2">
          {/* Appearance */}
          <FadeIn>
            <GlassPanel interactive>
              <div className="p-6 pb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/20 shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]">
                    <Palette className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">Appearance</h2>
                    <p className="text-white/60 text-sm">Choose your preferred theme</p>
                  </div>
                </div>
              </div>
              <div className="px-6 pb-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-white/80 mb-3 block">Color Theme</label>
                  <ThemeToggle variant="button" />
                </div>
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-white/50">
                    Your theme preference is saved automatically and persists across sessions.
                  </p>
                </div>
              </div>
            </GlassPanel>
          </FadeIn>

          {/* Profile */}
          <FadeIn>
            <GlassPanel interactive>
              <div className="p-6 pb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                    <User className="w-6 h-6 text-blue-300" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">Profile</h2>
                    <p className="text-white/60 text-sm">Manage your personal information</p>
                  </div>
                </div>
              </div>
              <div className="px-6 pb-6 space-y-3">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 shadow-inner">
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Display Name</p>
                  <p className="text-sm font-medium text-white">{profile ? `${profile.first_name} ${profile.last_name}` : '--'}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 shadow-inner">
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Email</p>
                  <p className="text-sm font-medium text-white">{profile?.email || '--'}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 shadow-inner">
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Department</p>
                  <p className="text-sm font-medium text-white">{profile?.department || '--'}</p>
                </div>
                <p className="text-xs text-white/50 pt-2">
                  Contact HR to update your profile information.
                </p>
              </div>
            </GlassPanel>
          </FadeIn>

          {/* Notifications */}
          <FadeIn className="md:col-span-2">
            <GlassPanel interactive>
              <div className="p-6 pb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.3)]">
                    <Bell className="w-6 h-6 text-orange-300" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">Notifications</h2>
                    <p className="text-white/60 text-sm">Manage your notification preferences</p>
                  </div>
                </div>
              </div>
              <div className="px-6 pb-6 space-y-3">
                {notificationItems.map(({ key, label, description, iconOn: IconOn, iconOff: IconOff }) => {
                  const value = prefs[key];
                  const isSaving = savingField === key;
                  const isSaved = savedField === key;

                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {value ? (
                          <IconOn className="w-5 h-5 text-primary" />
                        ) : (
                          <IconOff className="w-5 h-5 text-white/40" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-white">{label}</p>
                          <p className="text-xs text-white/60">{description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {isSaving && (
                          <Loader2 className="w-4 h-4 animate-spin text-white/50" />
                        )}
                        {isSaved && !isSaving && (
                          <span className="text-xs text-green-400 font-medium animate-fade-in">
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
                <p className="text-xs text-white/50 pt-2">
                  Changes are saved automatically when you toggle a setting.
                </p>
              </div>
            </GlassPanel>
          </FadeIn>
        </div>

        {/* Security Section */}
        <FadeIn>
          <GlassPanel interactive>
            <div className="p-6 pb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                  <Shield className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">Security</h2>
                  <p className="text-white/60 text-sm">Manage your account security settings</p>
                </div>
              </div>
            </div>
            <div className="px-6 pb-6">
              <Button
                variant="outline"
                className="justify-start gap-4 h-auto p-4 w-full bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white rounded-xl"
                onClick={async () => {
                  try {
                    const user = await supabaseGetUser();
                    if (!user?.email) {
                      showFeedback('error', 'Unable to determine your email address. Please sign in again.');
                      return;
                    }
                    const { error: resetErr } = await supabaseSendPasswordResetEmail(user.email);
                    if (resetErr) {
                      showFeedback('error', resetErr.message || 'Failed to send password reset email.');
                      return;
                    }
                    showFeedback('success', 'Password reset email sent! Check your inbox.', 5000);
                  } catch {
                    showFeedback('error', 'Failed to send password reset email. Please try again.');
                  }
                }}
              >
                <div className="p-2 bg-red-500/20 rounded-md">
                  <Mail className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="font-semibold text-left">Send Password Reset Email</p>
                  <p className="text-xs text-white/60 text-left">
                    You will receive a link to create a new password via email.
                  </p>
                </div>
              </Button>
            </div>
          </GlassPanel>
        </FadeIn>
      </StaggerContainer>
    </div>
  );
}
