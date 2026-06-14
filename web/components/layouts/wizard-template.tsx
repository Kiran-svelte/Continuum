import React from 'react';
import { ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WizardStep {
  id: string;
  label: string;
}

interface WizardTemplateProps {
  title: string;
  description?: string;
  steps: WizardStep[];
  currentStepIndex: number;
  onNext?: () => void;
  onBack?: () => void;
  onSubmit?: () => void;
  isNextDisabled?: boolean;
  isSubmitting?: boolean;
  children: React.ReactNode;
}

/**
 * Global Wizard Template
 * Standardizes multi-step processes like Onboarding, Payroll Runs, or Complex Form submissions.
 */
export function WizardTemplate({
  title,
  description,
  steps,
  currentStepIndex,
  onNext,
  onBack,
  onSubmit,
  isNextDisabled = false,
  isSubmitting = false,
  children,
}: WizardTemplateProps) {
  const isLastStep = currentStepIndex === steps.length - 1;

  return (
    <div className="flex flex-col min-h-full w-full bg-[var(--background)] pb-24 md:pb-0">
      {/* Header */}
      <div className="sticky top-0 z-20 px-4 py-6 md:px-8 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md">
        <h1 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            {description}
          </p>
        )}

        {/* Step Indicator */}
        <div className="mt-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-[var(--border)] z-0" />
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-[var(--primary)] z-0 transition-all duration-300"
              style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
            />
            
            {steps.map((step, idx) => {
              const isCompleted = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              
              return (
                <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors
                    ${isCompleted ? 'bg-[var(--primary)] border-[var(--primary)] text-white' : ''}
                    ${isCurrent ? 'bg-[var(--background)] border-[var(--primary)] text-[var(--primary)]' : ''}
                    ${!isCompleted && !isCurrent ? 'bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)]' : ''}
                  `}>
                    {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span className={`text-xs font-medium hidden md:block ${isCurrent || isCompleted ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-4 md:p-8 max-w-[1000px] w-full mx-auto">
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm p-6 md:p-8">
          {children}
        </div>
      </div>

      {/* Fixed Footer for Mobile / Sticky for Desktop */}
      <div className="fixed md:sticky bottom-0 left-0 right-0 z-50 p-4 bg-[var(--background)]/90 backdrop-blur-md border-t border-[var(--border)] shadow-[0_-4px_12px_rgba(0,0,0,0.05)] md:shadow-none flex items-center justify-between md:justify-end gap-3 md:px-8">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={currentStepIndex === 0 || isSubmitting}
          className="w-1/3 md:w-auto"
        >
          Back
        </Button>
        
        {isLastStep ? (
          <Button
            onClick={onSubmit}
            disabled={isSubmitting || isNextDisabled}
            className="w-2/3 md:w-auto"
          >
            {isSubmitting ? 'Submitting...' : 'Complete'}
          </Button>
        ) : (
          <Button
            onClick={onNext}
            disabled={isNextDisabled}
            className="w-2/3 md:w-auto"
          >
            Next Step
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
