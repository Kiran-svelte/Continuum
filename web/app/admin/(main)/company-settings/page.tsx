'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureMe } from '@/lib/client-auth';
import {
  Building2,
  Key,
  Globe,
  Calendar,
  Clock,
  Timer,
  FileText,
  AlertCircle,
  Info,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 20 } },
} as const;

interface CompanySettings {
  id: string;
  name: string;
  industry: string | null;
  size: string | null;
  timezone: string;
  country_code: string;
  join_code: string | null;
  sla_hours: number;
  negative_balance: boolean;
  probation_period_days: number;
  notice_period_days: number;
  work_days: number[];
  leave_year_start: string;
  onboarding_completed: boolean;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatWorkDays(days: number[]): string {
  if (!Array.isArray(days) || days.length === 0) return 'Not configured';
  return days
    .sort((a, b) => a - b)
    .map((d) => DAY_NAMES[d] ?? `Day ${d}`)
    .join(', ');
}

interface SettingRowProps {
  icon: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
  description?: string;
}

function SettingRow({ icon, label, value, description }: SettingRowProps) {
  return (
    <div className="flex items-start gap-4 px-5 py-4 border-b border-border/30 last:border-0 hover:bg-muted/30 dark:hover:bg-slate-800/30 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-muted/60 dark:bg-slate-800/60 flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="text-base font-semibold text-foreground mt-0.5">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </div>
  );
}

export default function CompanySettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const me = await ensureMe();
        if (!me) {
          router.replace('/sign-in');
          return;
        }

        const res = await fetch('/api/hr/settings', { credentials: 'include' });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to load company settings');
        }

        const data = await res.json();
        if (data.company) {
          setSettings(data.company);
        } else {
          throw new Error('No company data returned');
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load company settings';
        console.error('Failed to load company settings:', err);
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [router]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Building2 className="w-7 h-7 text-indigo-500" />
            Company Settings
          </h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants}>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Building2 className="w-7 h-7 text-indigo-500" />
            Company Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View your organization&apos;s configuration and policies
          </p>
        </div>
      </motion.div>

      {/* Info Banner */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
          <Info className="w-5 h-5 text-blue-500 shrink-0" />
          <p className="text-sm text-blue-700 dark:text-blue-400">
            These settings are read-only. Contact support to modify company configuration.
          </p>
        </div>
      </motion.div>

      {/* General Information */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">General Information</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <SettingRow
              icon={<Building2 className="w-5 h-5 text-indigo-500" />}
              label="Company Name"
              value={settings.name}
            />
            <SettingRow
              icon={<Key className="w-5 h-5 text-amber-500" />}
              label="Join Code"
              value={
                settings.join_code ? (
                  <span className="font-mono tracking-wider">{settings.join_code}</span>
                ) : (
                  <Badge variant="outline">Not set</Badge>
                )
              }
              description="Employees use this code to join the organization"
            />
            <SettingRow
              icon={<Globe className="w-5 h-5 text-blue-500" />}
              label="Timezone"
              value={settings.timezone}
            />
            {settings.industry && (
              <SettingRow
                icon={<Building2 className="w-5 h-5 text-slate-500" />}
                label="Industry"
                value={settings.industry}
              />
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Work Configuration */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Work Configuration</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <SettingRow
              icon={<Calendar className="w-5 h-5 text-emerald-500" />}
              label="Work Days"
              value={formatWorkDays(settings.work_days)}
              description="Days of the week employees are expected to work"
            />
            <SettingRow
              icon={<Clock className="w-5 h-5 text-violet-500" />}
              label="Leave Year Start"
              value={settings.leave_year_start || '01-01'}
              description="The date when the annual leave cycle resets (MM-DD)"
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Policy Settings */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Policy Settings</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <SettingRow
              icon={<Timer className="w-5 h-5 text-orange-500" />}
              label="Probation Period"
              value={`${settings.probation_period_days} days`}
              description="Duration of the probation period for new employees"
            />
            <SettingRow
              icon={<FileText className="w-5 h-5 text-red-500" />}
              label="Notice Period"
              value={`${settings.notice_period_days} days`}
              description="Required notice period before employee exit"
            />
            <SettingRow
              icon={<Clock className="w-5 h-5 text-blue-500" />}
              label="SLA Hours"
              value={`${settings.sla_hours} hours`}
              description="Maximum response time for leave and approval requests"
            />
            <SettingRow
              icon={<AlertCircle className="w-5 h-5 text-amber-500" />}
              label="Negative Leave Balance"
              value={
                settings.negative_balance ? (
                  <Badge variant="success">Allowed</Badge>
                ) : (
                  <Badge variant="outline">Not Allowed</Badge>
                )
              }
              description="Whether employees can take leaves beyond their available balance"
            />
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
