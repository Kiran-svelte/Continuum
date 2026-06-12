'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  CheckCircle2,
  Calendar,
  Users,
  FileText,
  Settings,
  ChevronRight,
  Rocket,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCompanyModules } from '@/hooks/use-company-modules';
import {
  filterQuickStartSteps,
  type QuickStartRole,
  type QuickStartStepDef,
} from '@/lib/quick-start-steps';

const STEP_ICONS: Record<string, typeof Calendar> = {
  profile: Users,
  'leave-balance': Calendar,
  'apply-leave': FileText,
  settings: Settings,
  team: Users,
  approvals: FileText,
  calendar: Calendar,
  reports: Settings,
};

interface QuickStartGuideProps {
  role: QuickStartRole;
  userName?: string;
}

export function QuickStartGuide({ role, userName = 'there' }: QuickStartGuideProps) {
  const { enabledModules, loading } = useCompanyModules();
  const [isOpen, setIsOpen] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(false);

  const steps = useMemo(() => {
    if (loading && enabledModules.length === 0) {
      return filterQuickStartSteps(role, []);
    }
    return filterQuickStartSteps(role, enabledModules);
  }, [role, enabledModules, loading]);

  useEffect(() => {
    const isDismissed = localStorage.getItem(`quickstart_dismissed_${role}`);
    if (isDismissed) {
      setDismissed(true);
      return;
    }

    const saved = localStorage.getItem(`quickstart_completed_${role}`);
    if (saved) {
      setCompletedSteps(JSON.parse(saved));
    }

    const hasSeenGuide = localStorage.getItem(`quickstart_seen_${role}`);
    if (!hasSeenGuide) {
      const timer = setTimeout(() => setIsOpen(true), 2000);
      localStorage.setItem(`quickstart_seen_${role}`, 'true');
      return () => clearTimeout(timer);
    }
  }, [role]);

  const markComplete = (stepId: string) => {
    const newCompleted = [...completedSteps, stepId];
    setCompletedSteps(newCompleted);
    localStorage.setItem(`quickstart_completed_${role}`, JSON.stringify(newCompleted));
  };

  const handleDismiss = () => {
    setIsOpen(false);
    setDismissed(true);
    localStorage.setItem(`quickstart_dismissed_${role}`, 'true');
  };

  const progress = steps.length > 0 ? (completedSteps.length / steps.length) * 100 : 0;
  const allComplete = steps.length > 0 && completedSteps.length >= steps.length;

  if (steps.length === 0) return null;
  if (dismissed && !isOpen) return null;

  return (
    <>
      {!isOpen && !allComplete && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-[var(--shadow-bento)] transition-shadow hover:shadow-[var(--shadow-md)]"
        >
          <Rocket className="w-5 h-5" />
          <span className="font-semibold">Quick Start</span>
          {completedSteps.length > 0 && (
            <span className="ml-1 rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs">
              {completedSteps.length}/{steps.length}
            </span>
          )}
        </motion.button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-[color-mix(in_srgb,var(--foreground)_35%,transparent)] p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-lg)] sm:rounded-2xl"
            >
              <div className="relative bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] p-6 pb-4">
                <button
                  onClick={() => setIsOpen(false)}
                  aria-label="Close quick start guide"
                  className="absolute top-4 right-4 rounded-lg p-2 transition-colors hover:bg-[var(--muted)]"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>

                <div className="mb-3 flex min-w-0 items-center gap-3 pr-10">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary">
                    <Sparkles className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="break-words text-xl font-bold text-foreground">Quick Start Guide</h2>
                    <p className="break-words text-sm leading-6 text-muted-foreground">Welcome, {userName}! Let&apos;s get you started.</p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="text-primary font-semibold">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-primary to-[var(--accent-primary-hover)] rounded-full"
                    />
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
                {steps.map((step, index) => (
                  <QuickStartStepRow
                    key={step.id}
                    step={step}
                    index={index}
                    isCompleted={completedSteps.includes(step.id)}
                    onComplete={() => markComplete(step.id)}
                  />
                ))}
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  onClick={handleDismiss}
                  className="min-h-10 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:text-foreground/80"
                >
                  Don&apos;t show again
                </button>
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function QuickStartStepRow({
  step,
  index,
  isCompleted,
  onComplete,
}: {
  step: QuickStartStepDef;
  index: number;
  isCompleted: boolean;
  onComplete: () => void;
}) {
  const Icon = STEP_ICONS[step.id] ?? FileText;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`rounded-xl border p-4 transition-all ${
        isCompleted
          ? 'border-[color-mix(in_srgb,var(--status-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--status-success)_10%,transparent)]'
          : 'border-[var(--border)] bg-[var(--card)] hover:border-[color-mix(in_srgb,var(--primary)_35%,transparent)] hover:bg-[var(--muted)]'
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            isCompleted
              ? 'bg-[color-mix(in_srgb,var(--status-success)_20%,transparent)]'
              : 'bg-[color-mix(in_srgb,var(--primary)_20%,transparent)]'
          }`}
        >
          {isCompleted ? (
            <CheckCircle2 className="h-5 w-5 text-[var(--status-success)]" />
          ) : (
            <Icon className="h-5 w-5 text-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={`font-semibold ${isCompleted ? 'text-[var(--status-success)]' : 'text-foreground'}`}>
            {step.title}
          </h3>
          <p className="mt-0.5 break-words text-sm leading-6 text-muted-foreground">{step.description}</p>
        </div>
        <a
          href={step.href}
          onClick={onComplete}
          className={`inline-flex min-h-9 w-full items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-center text-sm font-medium leading-5 transition-colors sm:w-auto ${
            isCompleted
              ? 'bg-[color-mix(in_srgb,var(--status-success)_20%,transparent)] text-[var(--status-success)]'
              : 'bg-[color-mix(in_srgb,var(--primary)_20%,transparent)] text-primary hover:bg-[color-mix(in_srgb,var(--primary)_30%,transparent)]'
          }`}
        >
          {isCompleted ? 'Done' : step.action}
          {!isCompleted && <ChevronRight className="w-4 h-4" />}
        </a>
      </div>
    </motion.div>
  );
}
