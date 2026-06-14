'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Calendar, 
  Users, 
  FileText, 
  Settings,
  Lightbulb,
  ChevronRight,
  Rocket
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuickStartStep {
  id: string;
  title: string;
  description: string;
  icon: typeof Calendar;
  action: string;
  href: string;
  completed?: boolean;
}

const EMPLOYEE_STEPS: QuickStartStep[] = [
  {
    id: 'profile',
    title: 'Complete Your Profile',
    description: 'Add your personal details and emergency contacts',
    icon: Users,
    action: 'Update Profile',
    href: '/employee/profile'
  },
  {
    id: 'leave-balance',
    title: 'Check Leave Balance',
    description: 'View your available leave days for each type',
    icon: Calendar,
    action: 'View Balance',
    href: '/employee/dashboard'
  },
  {
    id: 'apply-leave',
    title: 'Apply for Leave',
    description: 'Submit your first leave request',
    icon: FileText,
    action: 'Apply Now',
    href: '/employee/request-leave'
  },
  {
    id: 'settings',
    title: 'Configure Notifications',
    description: 'Set up email and push notifications',
    icon: Settings,
    action: 'Settings',
    href: '/employee/settings'
  }
];

const MANAGER_STEPS: QuickStartStep[] = [
  {
    id: 'team',
    title: 'View Your Team',
    description: 'See all team members and their status',
    icon: Users,
    action: 'View Team',
    href: '/manager/team'
  },
  {
    id: 'approvals',
    title: 'Review Pending Requests',
    description: 'Approve or reject team leave requests',
    icon: FileText,
    action: 'Review',
    href: '/manager/approvals'
  },
  {
    id: 'calendar',
    title: 'Team Calendar',
    description: 'View team availability at a glance',
    icon: Calendar,
    action: 'Open Calendar',
    href: '/manager/team-calendar'
  },
  {
    id: 'reports',
    title: 'Generate Reports',
    description: 'Create attendance and leave reports',
    icon: Settings,
    action: 'Reports',
    href: '/manager/reports'
  }
];

interface QuickStartGuideProps {
  role: 'employee' | 'manager' | 'hr' | 'admin';
  userName?: string;
}

export function QuickStartGuide({ role, userName = 'there' }: QuickStartGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(false);

  const steps = role === 'manager' ? MANAGER_STEPS : EMPLOYEE_STEPS;

  useEffect(() => {
    // Check if user has dismissed the guide
    const isDismissed = localStorage.getItem(`quickstart_dismissed_${role}`);
    if (isDismissed) {
      setDismissed(true);
      return;
    }

    // Load completed steps
    const saved = localStorage.getItem(`quickstart_completed_${role}`);
    if (saved) {
      setCompletedSteps(JSON.parse(saved));
    }

    // Show guide after a short delay for first-time users
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

  const progress = (completedSteps.length / steps.length) * 100;
  const allComplete = completedSteps.length === steps.length;

  if (dismissed && !isOpen) return null;

  return (
    <>
      {/* Floating Quick Start Button */}
      {!isOpen && !allComplete && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-[#6C63FF] to-[#4A90E2] text-primary-foreground shadow-lg shadow-[#6C63FF]/30 hover:shadow-[#6C63FF]/50 transition-shadow"
        >
          <Rocket className="w-5 h-5" />
          <span className="font-semibold">Quick Start</span>
          {completedSteps.length > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-[#f0ebfb] text-xs">
              {completedSteps.length}/{steps.length}
            </span>
          )}
        </motion.button>
      )}

      {/* Quick Start Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#241b42]/35 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-[#fcfbff] border border-[#e8e4f5] rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="relative p-6 pb-4 bg-gradient-to-br from-[#6C63FF]/20 to-transparent">
                <button
                  onClick={() => setIsOpen(false)}
                  aria-label="Close quick start guide"
                  className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[#f7f3ff] transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
                
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#4A90E2] flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Quick Start Guide</h2>
                    <p className="text-sm text-muted-foreground">Welcome, {userName}! Let's get you started.</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="text-[#6C63FF] font-semibold">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 bg-[#f7f3ff] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-[#6C63FF] to-[#4A90E2] rounded-full"
                    />
                  </div>
                </div>
              </div>

              {/* Steps */}
              <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isCompleted = completedSteps.includes(step.id);

                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-xl border transition-all ${
                        isCompleted
                          ? 'bg-[#00E682]/10 border-[#00E682]/30'
                          : 'bg-[#faf8ff] border-[#ece5f9] hover:border-[#6C63FF]/50 hover:bg-[#f7f3ff]'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isCompleted
                            ? 'bg-[#00E682]/20'
                            : 'bg-[#6C63FF]/20'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-[#00E682]" />
                          ) : (
                            <Icon className="w-5 h-5 text-[#6C63FF]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold ${isCompleted ? 'text-[#00E682]' : 'text-foreground'}`}>
                            {step.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>
                        </div>
                        <a
                          href={step.href}
                          onClick={() => markComplete(step.id)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            isCompleted
                              ? 'bg-[#00E682]/20 text-[#00E682]'
                              : 'bg-[#6C63FF]/20 text-[#6C63FF] hover:bg-[#6C63FF]/30'
                          }`}
                        >
                          {isCompleted ? 'Done' : step.action}
                          {!isCompleted && <ChevronRight className="w-4 h-4" />}
                        </a>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-[#ece5f9] flex items-center justify-between">
                <button
                  onClick={handleDismiss}
                  className="text-sm text-muted-foreground hover:text-foreground/80 transition-colors"
                >
                  Don't show again
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
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
