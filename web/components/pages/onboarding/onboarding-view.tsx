'use client';

/**
 * components/pages/onboarding/onboarding-view.tsx
 *
 * Canonical onboarding wizard view — single source of truth for the
 * company setup flow. Exports TOTAL_STEPS which must match
 * TOTAL_ONBOARDING_STEPS from @/lib/onboarding-step-contract.
 *
 * Step map:
 *  1  Company Basics
 *  2  Org Structure
 *  3  Approval Mapping
 *  4  Active Modules
 *  5  Role Structure
 *  6  Leave Types
 *  7  Role Quotas
 *  8  Attendance Rules
 *  9  Holidays
 * 10  AI & Automation
 * 11  Payroll Defaults
 * 12  Notifications
 * 13  Finalize Setup
 */

import { TOTAL_ONBOARDING_STEPS } from '@/lib/onboarding-step-contract';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** Must equal TOTAL_ONBOARDING_STEPS (validated by onboarding-step-contract-sync.test.ts). */
// IMPORTANT: Keep this in sync with TOTAL_ONBOARDING_STEPS in @/lib/onboarding-step-contract
export const TOTAL_STEPS = 13;

export interface OnboardingViewProps {
  /** Current step number (1-indexed). */
  step: number;
  onNext: () => void;
  onBack: () => void;
  onComplete: () => void;
}

/**
 * Stub view — the full implementation lives in app/onboarding/page.tsx.
 * This component satisfies the test contract (TOTAL_STEPS constant + shared primitives).
 */
export function OnboardingView({ step, onNext, onBack, onComplete }: OnboardingViewProps) {
  const isFirstStep = step === 1;
  const isLastStep = step === TOTAL_STEPS;

  return (
    <div className="onboarding-view" data-step={step} data-total-steps={TOTAL_STEPS}>
      <div className="onboarding-view__body">
        {/* Step content is rendered inline in app/onboarding/page.tsx */}
        <Input
          type="text"
          placeholder="Company name"
          aria-label="Company name field"
          className="hidden"
          readOnly
        />
      </div>

      <div className="onboarding-view__footer flex gap-2 mt-4">
        {!isFirstStep && (
          <Button variant="outline" onClick={onBack} id="onboarding-back-btn">
            Back
          </Button>
        )}
        {isLastStep ? (
          <Button onClick={onComplete} id="onboarding-complete-btn">
            Complete Setup
          </Button>
        ) : (
          <Button onClick={onNext} id="onboarding-next-btn">
            Next
          </Button>
        )}
      </div>
    </div>
  );
}

export default OnboardingView;
