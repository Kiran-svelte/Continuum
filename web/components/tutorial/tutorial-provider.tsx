'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';

// Tutorial step definition
export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for the element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'click' | 'hover' | 'input' | 'scroll';
  actionLabel?: string;
  route?: string; // Navigate to this route for this step
  image?: string;
  video?: string;
}

export interface TutorialConfig {
  id: string;
  name: string;
  description: string;
  role: 'employee' | 'hr' | 'manager' | 'all';
  steps: TutorialStep[];
}

interface TutorialContextType {
  currentTutorial: TutorialConfig | null;
  currentStep: number;
  isActive: boolean;
  startTutorial: (tutorial: TutorialConfig) => void;
  endTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  skipTutorial: () => void;
  completedTutorials: string[];
  suppressedTutorials: string[];
  markAsCompleted: (tutorialId: string) => void;
  suppressTutorial: (tutorialId: string) => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

const STORAGE_KEY = 'continuum-completed-tutorials';
const SUPPRESS_KEY = 'continuum-suppress-tutorials';

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [currentTutorial, setCurrentTutorial] = useState<TutorialConfig | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [completedTutorials, setCompletedTutorials] = useState<string[]>([]);
  const [suppressedTutorials, setSuppressedTutorials] = useState<string[]>([]);

  // Load completed tutorials and suppressed list from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setCompletedTutorials(JSON.parse(stored));
    }
    const suppressed = localStorage.getItem(SUPPRESS_KEY);
    if (suppressed) {
      setSuppressedTutorials(JSON.parse(suppressed));
    }
  }, []);

  const markAsCompleted = useCallback((tutorialId: string) => {
    setCompletedTutorials((prev) => {
      if (prev.includes(tutorialId)) return prev;
      const updated = [...prev, tutorialId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const endTutorial = useCallback(() => {
    if (currentTutorial) {
      markAsCompleted(currentTutorial.id);
    }
    setCurrentTutorial(null);
    setCurrentStep(0);
    setIsActive(false);
  }, [currentTutorial, markAsCompleted]);

  const startTutorial = useCallback((tutorial: TutorialConfig) => {
    setCurrentTutorial(tutorial);
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const nextStep = useCallback(() => {
    if (currentTutorial && currentStep < currentTutorial.steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      endTutorial();
    }
  }, [currentTutorial, currentStep, endTutorial]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: number) => {
    if (currentTutorial && step >= 0 && step < currentTutorial.steps.length) {
      setCurrentStep(step);
    }
  }, [currentTutorial]);

  const suppressTutorial = useCallback((tutorialId: string) => {
    setSuppressedTutorials((prev) => {
      if (prev.includes(tutorialId)) return prev;
      const updated = [...prev, tutorialId];
      localStorage.setItem(SUPPRESS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const skipTutorial = useCallback(() => {
    setCurrentTutorial(null);
    setCurrentStep(0);
    setIsActive(false);
  }, []);

  return (
    <TutorialContext.Provider
      value={{
        currentTutorial,
        currentStep,
        isActive,
        startTutorial,
        endTutorial,
        nextStep,
        prevStep,
        goToStep,
        skipTutorial,
        completedTutorials,
        suppressedTutorials,
        markAsCompleted,
        suppressTutorial,
      }}
    >
      {children}
      <TutorialOverlay />
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}

// Tutorial overlay component
function TutorialOverlay() {
  const {
    currentTutorial,
    currentStep,
    isActive,
    nextStep,
    prevStep,
    skipTutorial,
    endTutorial,
    suppressTutorial,
  } = useTutorial();
  const router = useRouter();
  const pathname = usePathname();
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const isNavigatingRef = useRef(false);

  // Navigate to the step's route when the current step changes
  useEffect(() => {
    if (!isActive || !currentTutorial) return;
    const step = currentTutorial.steps[currentStep];
    if (step.route && pathname !== step.route) {
      isNavigatingRef.current = true;
      router.push(step.route);
      // Allow time for navigation to complete before showing the step
      const timer = setTimeout(() => {
        isNavigatingRef.current = false;
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [currentStep, isActive, currentTutorial, router, pathname]);

  if (!isActive || !currentTutorial) return null;

  const step = currentTutorial.steps[currentStep];
  const isLastStep = currentStep === currentTutorial.steps.length - 1;
  const progress = ((currentStep + 1) / currentTutorial.steps.length) * 100;

  const handleSkip = () => {
    if (dontShowAgain && currentTutorial) {
      suppressTutorial(currentTutorial.id);
    }
    skipTutorial();
  };

  const handleComplete = () => {
    if (dontShowAgain && currentTutorial) {
      suppressTutorial(currentTutorial.id);
    }
    endTutorial();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100]">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Spotlight on target element */}
        {step.target && <Spotlight selector={step.target} />}

        {/* Tutorial card */}
        <TutorialCard
          step={step}
          stepNumber={currentStep + 1}
          totalSteps={currentTutorial.steps.length}
          progress={progress}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={handleSkip}
          onComplete={handleComplete}
          isLastStep={isLastStep}
          isFirstStep={currentStep === 0}
          dontShowAgain={dontShowAgain}
          onDontShowAgainChange={setDontShowAgain}
        />
      </div>
    </AnimatePresence>
  );
}

// Spotlight effect
function Spotlight({ selector }: { selector: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const element = document.querySelector(selector);
    if (element) {
      setRect(element.getBoundingClientRect());
      // Scroll element into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selector]);

  if (!rect) return null;

  // Large value to create a "cutout" effect - the box-shadow extends beyond viewport
  // to dim everything except the highlighted element
  const SPOTLIGHT_OVERLAY_SIZE = 'max(100vw, 100vh, 9999px)';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute rounded-lg ring-4 ring-primary ring-offset-4 ring-offset-transparent pointer-events-none"
      style={{
        top: rect.top - 8,
        left: rect.left - 8,
        width: rect.width + 16,
        height: rect.height + 16,
        boxShadow: `0 0 0 ${SPOTLIGHT_OVERLAY_SIZE} rgba(0, 0, 0, 0.5)`,
      }}
    />
  );
}

// Tutorial card component
interface TutorialCardProps {
  step: TutorialStep;
  stepNumber: number;
  totalSteps: number;
  progress: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onComplete: () => void;
  isLastStep: boolean;
  isFirstStep: boolean;
  dontShowAgain: boolean;
  onDontShowAgainChange: (value: boolean) => void;
}

function TutorialCard({
  step,
  stepNumber,
  totalSteps,
  progress,
  onNext,
  onPrev,
  onSkip,
  onComplete,
  isLastStep,
  isFirstStep,
  dontShowAgain,
  onDontShowAgainChange,
}: TutorialCardProps) {
  const positionStyles = {
    center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    top: 'top-4 left-1/2 -translate-x-1/2',
    bottom: 'bottom-4 left-1/2 -translate-x-1/2',
    left: 'top-1/2 left-4 -translate-y-1/2',
    right: 'top-1/2 right-4 -translate-y-1/2',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'absolute z-10 w-full max-w-md rounded-2xl bg-card text-card-foreground border border-border shadow-2xl overflow-hidden',
        positionStyles[step.position || 'center']
      )}
    >
      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-medium">
            {stepNumber}
          </span>
          <span className="text-sm text-muted-foreground">
            of {totalSteps} steps
          </span>
        </div>
        <button
          onClick={onSkip}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Skip tutorial"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {step.image && (
          <div className="mb-4 rounded-lg overflow-hidden bg-muted">
            <img src={step.image} alt={step.title} className="w-full" />
          </div>
        )}
        <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
        <p className="text-muted-foreground">{step.description}</p>
        {step.route && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block px-2 py-0.5 rounded bg-muted font-mono">{step.route}</span>
          </div>
        )}
        {step.actionLabel && (
          <div className="mt-4 flex items-center gap-2 text-sm text-primary">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>{step.actionLabel}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-3 px-6 py-4 border-t border-border bg-muted/30">
        {/* Don't show again checkbox */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => onDontShowAgainChange(e.target.checked)}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-current"
          />
          <span className="text-xs text-muted-foreground">Don&apos;t show this tutorial again</span>
        </label>

        <div className="flex items-center justify-between">
          <button
            onClick={onPrev}
            disabled={isFirstStep}
            className={cn(
              'flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              isFirstStep
                ? 'text-muted-foreground/50 cursor-not-allowed'
                : 'text-foreground hover:bg-muted'
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={isLastStep ? onComplete : onNext}
            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {isLastStep ? (
              <>
                Complete
                <Check className="w-4 h-4" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Start tutorial button component
interface StartTutorialButtonProps {
  tutorial: TutorialConfig;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
}

export function StartTutorialButton({
  tutorial,
  className,
  variant = 'default',
}: StartTutorialButtonProps) {
  const { startTutorial, completedTutorials } = useTutorial();
  const isCompleted = completedTutorials.includes(tutorial.id);

  const variantStyles = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-border text-foreground hover:bg-muted',
    ghost: 'text-foreground hover:bg-muted',
  };

  return (
    <button
      onClick={() => startTutorial(tutorial)}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
        variantStyles[variant],
        className
      )}
    >
      {isCompleted ? (
        <>
          <Check className="w-4 h-4" />
          Completed - Start Again
        </>
      ) : (
        <>
          <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
          Start Tutorial
        </>
      )}
    </button>
  );
}
