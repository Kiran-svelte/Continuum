'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface Step {
  id: string;
  title: string;
  description?: string;
}

interface ProgressStepsProps {
  steps: Step[];
  currentStep: string;
  completedSteps?: string[];
  className?: string;
}

export function ProgressSteps({ 
  steps, 
  currentStep, 
  completedSteps = [], 
  className 
}: ProgressStepsProps) {
  const currentIndex = steps.findIndex(step => step.id === currentStep);
  
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          const isPast = index < currentIndex;
          
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-all duration-200',
                    (isCompleted || isCurrent) && 'bg-primary border-primary text-primary-foreground',
                    (!isCompleted && !isCurrent) && 'bg-muted border-border text-muted-foreground',
                    isCompleted && 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900/20 dark:border-green-400 dark:text-green-300',
                    isCurrent && 'animate-pulse'
                  )}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="mt-2 text-center">
                  <div
                    className={cn(
                      'text-sm font-medium',
                      isCurrent && 'text-primary',
                      (!isCurrent && !isCompleted) && 'text-muted-foreground',
                      isCompleted && 'text-foreground'
                    )}
                  >
                    {step.title}
                  </div>
                  {step.description && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {step.description}
                    </div>
                  )}
                </div>
              </div>
              
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-4 transition-colors duration-200',
                    (index < currentIndex || completedSteps.includes(step.id)) && 'bg-primary',
                    (index >= currentIndex && !completedSteps.includes(step.id)) && 'bg-border'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
}

export function ProgressBar({
  progress,
  label,
  showPercentage = false,
  variant = 'default',
  className
}: ProgressBarProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  
  const variantClasses = {
    default: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };
  
  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm font-medium text-foreground">{label}</span>}
          {showPercentage && (
            <span className="text-sm text-muted-foreground">{Math.round(clampedProgress)}%</span>
          )}
        </div>
      )}
      <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
        <div
          className={cn(
            'h-2 rounded-full transition-all duration-300 ease-out',
            variantClasses[variant]
          )}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}

interface ProcessingStateProps {
  state: 'idle' | 'processing' | 'success' | 'error';
  steps?: string[];
  currentStep?: string;
  message?: string;
  className?: string;
}

export function ProcessingState({
  state,
  steps = [],
  currentStep,
  message,
  className
}: ProcessingStateProps) {
  const currentIndex = steps.indexOf(currentStep || '');
  const progress = steps.length > 0 ? ((currentIndex + 1) / steps.length) * 100 : 0;
  
  const stateConfig = {
    idle: { color: 'text-muted-foreground', icon: '⏸️' },
    processing: { color: 'text-blue-600', icon: '⏳' },
    success: { color: 'text-green-600', icon: '✅' },
    error: { color: 'text-red-600', icon: '❌' },
  };
  
  const config = stateConfig[state];
  
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{config.icon}</span>
        <div className="flex-1">
          <div className={cn('font-medium', config.color)}>
            {message || `${state.charAt(0).toUpperCase() + state.slice(1)}`}
          </div>
          {currentStep && state === 'processing' && (
            <div className="text-sm text-muted-foreground">
              {currentStep}
            </div>
          )}
        </div>
      </div>
      
      {state === 'processing' && steps.length > 0 && (
        <ProgressBar
          progress={progress}
          variant="default"
          showPercentage
        />
      )}
    </div>
  );
}