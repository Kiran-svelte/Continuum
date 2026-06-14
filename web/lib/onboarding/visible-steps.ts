import { filterOnboardingSteps, TOTAL_ONBOARDING_STEPS } from '@/lib/onboarding-step-contract';
import type { ModuleSlug } from '@/lib/core-functions/catalog';

/** Canonical step numbers visible for the given enabled modules. */
export function resolveVisibleOnboardingSteps(enabledModules: readonly ModuleSlug[]): number[] {
  const steps = filterOnboardingSteps(enabledModules);
  return steps.length > 0 ? steps : [1, 2, 3, 4, 5, 13];
}

/** Next visible canonical step after `lastCompletedStep` (or first step if none). */
export function maxReachableOnboardingStep(
  visibleSteps: readonly number[],
  lastCompletedStep: number
): number {
  if (visibleSteps.length === 0) return TOTAL_ONBOARDING_STEPS;
  let lastVisibleCompletedIndex = -1;
  for (let i = 0; i < visibleSteps.length; i += 1) {
    if (visibleSteps[i]! <= lastCompletedStep) {
      lastVisibleCompletedIndex = i;
    }
  }
  const nextIndex = lastVisibleCompletedIndex + 1;
  return visibleSteps[nextIndex] ?? visibleSteps[visibleSteps.length - 1] ?? TOTAL_ONBOARDING_STEPS;
}

/** Steps that must be auto-skipped when jumping from lastCompleted to target (e.g. hidden payroll step 11). */
export function canonicalStepsToBridge(lastCompletedStep: number, targetStep: number): number[] {
  if (targetStep <= lastCompletedStep + 1) return [];
  const bridged: number[] = [];
  for (let step = lastCompletedStep + 1; step < targetStep; step += 1) {
    bridged.push(step);
  }
  return bridged;
}

export function isOnboardingStepAllowed(
  step: number,
  lastCompletedStep: number,
  visibleSteps: readonly number[]
): boolean {
  if (step <= lastCompletedStep) return true;
  const maxReachable = maxReachableOnboardingStep(visibleSteps, lastCompletedStep);
  return step <= maxReachable;
}
