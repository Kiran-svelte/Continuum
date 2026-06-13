import { redirect } from 'next/navigation';

/**
 * Legacy company onboarding route — permanently replaced by /onboarding.
 * Implements L5-01-007: 308 redirect to canonical onboarding wizard.
 */
export default function LegacyCompanyOnboardingRedirect(): never {
  redirect('/onboarding');
}
