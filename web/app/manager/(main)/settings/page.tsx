'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '@/components/theme-toggle';
import { TiltCard, FadeIn, StaggerContainer } from '@/components/motion';
import { GlassPanel } from '@/components/glass-panel';
import { PageHeader } from '@/components/page-header';
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

/* ------------------------------------------------------------------ */
/*  Animated Toggle Switch                                             */
/* ------------------------------------------------------------------ */

const spring = {
  type: 'spring' as const,
  stiffness: 700,
  damping: 30,
};

function AnimatedToggleSwitch({
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
      className={`relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${value ? 'bg-primary' : 'bg-black/30'}`}
    >
      <motion.div
        className="absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-md"
        layout
        transition={spring}
        style={{
          translateX: value ? '1.5rem' : '0rem',
        }}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function SettingsSkeleton() {
  return (
    <div className="p-4 sm:p-6 pb-32">
      <div className="space-y-8">
        {/* Header skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 bg-white/10" />
          <Skeleton className="h-4 w-72 bg-white/10" />
        </div>

        {/* Settings cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <GlassPanel key={i} className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-xl bg-white/10" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32 bg-white/10" />
                  <Skeleton className="h-4 w-40 bg-white/10" />
                </div>
              </div>
              <div className="space-y-4">
                <Skeleton className="h-12 w-full bg-black/20 rounded-lg" />
                <Skeleton className="h-12 w-full bg-black/20 rounded-lg" />
              </div>
            </GlassPanel>
          ))}
        </div>
      </div>
    </div>
  );
}


/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

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
    return <SettingsSkeleton />;
  }

  if (loadError && !profile) {
    return (
      <div className="p-4 sm:p-6">
        <FadeIn>
          <PageHeader
            title="Manager Settings"
            description="Customize your experience and team preferences"
          />
          <TiltCard>
            <GlassPanel className="border-red-500/30 p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto ring-4 ring-red-500/20">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-white font-semibold mt-6 text-xl">Unable to load settings</p>
              <p className="text-white/60 text-sm mt-2 max-w-sm mx-auto">{loadError}</p>
              <Button
                variant="outline"
                className="mt-6 bg-white/5 border-white/20 text-white/80 hover:bg-white/10 hover:text-white"
                onClick={loadAll}
              >
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Retry
              </Button>
            </GlassPanel>
          </TiltCard>
        </FadeIn>
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
    <div className="p-4 sm:p-6 pb-32">
      <StaggerContainer>
        {/* Header */}
        <PageHeader
          title="Manager Settings"
          description="Customize your experience and team preferences"
          action={
            <AnimatePresence>
              {feedback && (
                <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 30, scale: 0.95 }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg ${
                    feedback.type === 'success'
                      ? 'bg-green-500/10 border border-green-500/30 text-green-300 shadow-green-500/10'
                      : 'bg-red-500/10 border border-red-500/30 text-red-300 shadow-red-500/10'
                  }`}
                >
                  {feedback.type === 'success' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                  <span className="text-sm font-medium">{feedback.message}</span>
                </motion.div>
              )}
            </AnimatePresence>
          }
        />

        <div className="grid gap-6 md:grid-cols-2 mt-8">
          {/* Appearance */}
          <SettingsCard
            icon={Palette}
            iconColor="bg-sky-500/10 text-sky-400"
            title="Appearance"
            description="Choose your preferred theme"
          >
            <div className="p-4 bg-black/20 rounded-lg">
              <label className="text-sm font-medium text-white/80 mb-3 block">Color Theme</label>
              <ThemeToggle variant="icon" />
            </div>
            <p className="text-xs text-white/50 pt-3">
              Your theme preference is saved automatically and persists across sessions.
            </p>
          </SettingsCard>

          {/* Team Notifications */}
          <SettingsCard
            icon={Bell}
            iconColor="bg-orange-500/10 text-orange-400"
            title="Notifications"
            description="Manage your notification preferences"
          >
            <div className="space-y-3">
              {notificationItems.map(({ key, label, description, iconOn: IconOn, iconOff: IconOff }) => {
                const value = prefs[key];
                const isSaving = savingField === key;
                const isSaved = savedField === key;

                return (
                  <div
                    key={key}
                    className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/10"
                  >
                    <div className="flex items-center gap-4">
                      {value ? (
                        <IconOn className="w-5 h-5 text-primary" />
                      ) : (
                        <IconOff className="w-5 h-5 text-white/40" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-white/90">{label}</p>
                        <p className="text-xs text-white/60">{description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {isSaving && <Loader2 className="w-4 h-4 animate-spin text-white/50" />}
                      {isSaved && !isSaving && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          className="text-xs text-green-400 font-medium overflow-hidden"
                        >
                          Saved
                        </motion.span>
                      )}
                      <AnimatedToggleSwitch
                        value={value}
                        onChange={(v) => handleToggle(key, v)}
                        label={label}
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-white/50 pt-3">
              Changes are saved automatically when you toggle a setting.
            </p>
          </SettingsCard>

          {/* Sound & Accessibility */}
          <SettingsCard
            icon={Volume2}
            iconColor="bg-blue-500/10 text-blue-400"
            title="Sound & Accessibility"
            description="Configure audio and display settings"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/10">
                <div className="flex items-center gap-4">
                  {soundEnabled ? (
                    <Volume2 className="w-5 h-5 text-primary" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-white/40" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-white/90">Sound Alerts</p>
                    <p className="text-xs text-white/60">Play sound for notifications</p>
                  </div>
                </div>
                <AnimatedToggleSwitch value={soundEnabled} onChange={setSoundEnabled} label="Sound Alerts" />
              </div>
              <div className="p-3 rounded-lg bg-black/20 border border-white/10">
                <div className="flex items-center gap-4">
                  <Globe className="w-5 h-5 text-white/40" />
                  <div>
                    <p className="text-sm font-medium text-white/90">Timezone</p>
                    <p className="text-xs text-white/60">{profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
                  </div>
                </div>
              </div>
            </div>
          </SettingsCard>

          {/* Security */}
          <SettingsCard
            icon={Shield}
            iconColor="bg-red-500/10 text-red-400"
            title="Security"
            description="Manage your account security"
          >
            <Button
              variant="outline"
              className="w-full justify-start gap-4 h-auto py-4 bg-black/20 border-white/10 text-white/80 hover:bg-white/10 hover:text-white"
              onClick={async () => {
                try {
                  const user = await supabaseGetUser();
                  if (!user?.email) {
                    showFeedback('error', 'Unable to determine your email address.');
                    return;
                  }
                  const { error: resetErr } = await supabaseSendPasswordResetEmail(user.email);
                  if (resetErr) {
                    showFeedback('error', resetErr.message || 'Failed to send email.');
                    return;
                  }
                  showFeedback('success', 'Password reset email sent!', 5000);
                } catch {
                  showFeedback('error', 'Failed to send password reset email.');
                }
              }}
            >
              <Shield className="w-6 h-6 text-red-400" />
              <div className="text-left">
                <p className="font-semibold text-base">Change Password</p>
                <p className="text-xs text-white/60">Send a password reset link to your email</p>
              </div>
            </Button>
          </SettingsCard>
        </div>
      </StaggerContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Settings Card Wrapper                                              */
/* ------------------------------------------------------------------ */

function SettingsCard({
  icon: Icon,
  iconColor,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <FadeIn>
      <TiltCard>
        <GlassPanel className="p-6 h-full">
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${iconColor}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{title}</h3>
              <p className="text-sm text-white/60">{description}</p>
            </div>
          </div>
          {children}
        </GlassPanel>
      </TiltCard>
    </FadeIn>
  );
}
