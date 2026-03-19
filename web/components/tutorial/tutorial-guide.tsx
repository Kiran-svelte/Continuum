'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Sparkles,
  Play,
  Info,
  Lightbulb,
  Target,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  content?: React.ReactNode;
  highlight?: string; // CSS selector to highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface TutorialConfig {
  id: string;
  title: string;
  description: string;
  steps: TutorialStep[];
  onComplete?: () => void;
  onSkip?: () => void;
}

interface TutorialGuideProps {
  config: TutorialConfig;
  isOpen: boolean;
  onClose: () => void;
  currentStep?: number;
  onStepChange?: (step: number) => void;
}

// ─── Tutorial Guide Component ─────────────────────────────────────────────────

export function TutorialGuide({
  config,
  isOpen,
  onClose,
  currentStep: controlledStep,
  onStepChange,
}: TutorialGuideProps) {
  const [internalStep, setInternalStep] = useState(0);
  const currentStep = controlledStep ?? internalStep;
  const setCurrentStep = onStepChange ?? setInternalStep;
  
  const step = config.steps[currentStep];
  const isLastStep = currentStep === config.steps.length - 1;
  const isFirstStep = currentStep === 0;

  useEffect(() => {
    if (!isOpen) {
      setInternalStep(0);
    }
  }, [isOpen]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      config.onComplete?.();
      onClose();
    } else {
      setCurrentStep(currentStep + 1);
    }
  }, [isLastStep, currentStep, config, onClose, setCurrentStep]);

  const handlePrev = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  }, [isFirstStep, currentStep, setCurrentStep]);

  const handleSkip = useCallback(() => {
    config.onSkip?.();
    onClose();
  }, [config, onClose]);

  if (!isOpen || !step) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center"
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleSkip}
        />

        {/* Tutorial Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg mx-4 bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">{config.title}</h2>
                  <p className="text-sm text-white/60">{config.description}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-white/60 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Progress */}
          <div className="px-6 pt-4">
            <div className="flex items-center gap-2">
              {config.steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i <= currentStep 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500' 
                      : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-white/40 mt-2">
              Step {currentStep + 1} of {config.steps.length}
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-start gap-4 mb-4">
                  {step.icon && (
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                      {step.icon}
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {step.title}
                    </h3>
                    <p className="text-white/70 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>

                {step.content && (
                  <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
                    {step.content}
                  </div>
                )}

                {step.action && (
                  <Button
                    onClick={step.action.onClick}
                    className="mt-4 w-full gap-2"
                  >
                    <Play className="h-4 w-4" />
                    {step.action.label}
                  </Button>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={isFirstStep}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleSkip}
              >
                Skip Tutorial
              </Button>
              <Button
                onClick={handleNext}
                className="gap-2"
              >
                {isLastStep ? (
                  <>
                    <Check className="h-4 w-4" />
                    Complete
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Welcome Modal ────────────────────────────────────────────────────────────

interface WelcomeModalProps {
  role: string;
  userName: string;
  isOpen: boolean;
  onStartTutorial: () => void;
  onSkip: () => void;
}

export function WelcomeModal({
  role,
  userName,
  isOpen,
  onStartTutorial,
  onSkip,
}: WelcomeModalProps) {
  if (!isOpen) return null;

  const roleMessages: Record<string, { title: string; description: string }> = {
    admin: {
      title: 'Welcome to Continuum!',
      description: "As the company administrator, you have full access to configure your organization, manage HR settings, and oversee all operations.",
    },
    hr: {
      title: 'Welcome to the HR Portal!',
      description: "You can manage employees, configure leave policies, process payroll, and handle all HR-related tasks for your organization.",
    },
    manager: {
      title: 'Welcome, Manager!',
      description: "You can approve leave requests, manage your team, track attendance, and oversee your department's performance.",
    },
    team_lead: {
      title: 'Welcome, Team Lead!',
      description: "You can manage your team's schedules, approve requests, and help coordinate team activities.",
    },
    employee: {
      title: 'Welcome to Continuum!',
      description: "You can apply for leave, track attendance, view your payslips, and manage your profile from here.",
    },
  };

  const message = roleMessages[role] || roleMessages.employee;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center"
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md mx-4 bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Decorative gradient */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20" />

          <div className="relative p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', damping: 15 }}
              className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center"
            >
              <Sparkles className="h-10 w-10 text-white" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-white mb-2">
                {message.title}
              </h2>
              <p className="text-lg text-blue-300 mb-4">
                Hi, {userName}! 👋
              </p>
              <p className="text-white/70 mb-8">
                {message.description}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-3"
            >
              <Button
                onClick={onStartTutorial}
                className="w-full gap-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              >
                <BookOpen className="h-4 w-4" />
                Start Quick Tour
              </Button>
              <Button
                variant="ghost"
                onClick={onSkip}
                className="w-full text-white/60"
              >
                Skip for now
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Tooltip Guide ────────────────────────────────────────────────────────────

interface TooltipGuideProps {
  children: React.ReactNode;
  tip: string;
  show?: boolean;
}

export function TooltipGuide({ children, tip, show = true }: TooltipGuideProps) {
  const [isVisible, setIsVisible] = useState(false);

  if (!show) return <>{children}</>;

  return (
    <div className="relative" onMouseEnter={() => setIsVisible(true)} onMouseLeave={() => setIsVisible(false)}>
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-slate-800 border border-white/10 rounded-lg shadow-lg max-w-xs"
          >
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-sm text-white/80">{tip}</p>
            </div>
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 border-l border-t border-white/10 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Feature Highlight ────────────────────────────────────────────────────────

interface FeatureHighlightProps {
  children: React.ReactNode;
  title: string;
  description: string;
  isNew?: boolean;
}

export function FeatureHighlight({ 
  children, 
  title, 
  description, 
  isNew = false 
}: FeatureHighlightProps) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="relative group">
      {isNew && (
        <span className="absolute -top-2 -right-2 px-2 py-0.5 text-xs font-medium bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full z-10">
          New
        </span>
      )}
      {children}
      <button
        onClick={() => setShowInfo(!showInfo)}
        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Info className="h-3 w-3 text-white/60" />
      </button>
      
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute z-50 top-full right-0 mt-2 w-64 p-4 bg-slate-800 border border-white/10 rounded-xl shadow-lg"
          >
            <h4 className="text-sm font-semibold text-white mb-1">{title}</h4>
            <p className="text-xs text-white/60">{description}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
