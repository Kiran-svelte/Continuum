'use client';

/**
 * Onboarding View — entry point for new-company onboarding wizard.
 * Delegates to step-specific views based on completion state.
 */

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function OnboardingView() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold">Welcome to Continuum HRMS</h1>
      <p className="text-muted-foreground text-center max-w-md">
        Let&apos;s set up your organization. This will only take a few minutes.
      </p>
      <Button onClick={() => router.push('/onboarding/steps/step-1-company')}>
        Get Started
      </Button>
    </div>
  );
}

export default OnboardingView;
