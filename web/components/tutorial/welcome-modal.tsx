'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TiltCard } from '@/components/motion';
import { useTutorial, TutorialConfig } from './tutorial-provider';
import { X, Play, ArrowRight, Sparkles, CheckCircle } from 'lucide-react';

interface WelcomeModalProps {
  tutorial: TutorialConfig;
  userName?: string;
  roleName?: string;
}

const WELCOME_SHOWN_KEY = 'continuum-welcome-shown';

export function WelcomeModal({ tutorial, userName, roleName = 'Employee' }: WelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { startTutorial, completedTutorials } = useTutorial();

  useEffect(() => {
    // Check if welcome was already shown
    const welcomeShown = localStorage.getItem(WELCOME_SHOWN_KEY);
    const tutorialCompleted = completedTutorials.includes(tutorial.id);
    
    if (!welcomeShown && !tutorialCompleted) {
      // Delay showing modal for better UX
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [completedTutorials, tutorial.id]);

  const handleStartTutorial = () => {
    localStorage.setItem(WELCOME_SHOWN_KEY, 'true');
    setIsOpen(false);
    startTutorial(tutorial);
  };

  const handleSkip = () => {
    localStorage.setItem(WELCOME_SHOWN_KEY, 'true');
    setIsOpen(false);
  };

  const handleMaybeLater = () => {
    setIsOpen(false);
    // Don't set welcomeShown so it shows again next session
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleMaybeLater}
            className="fixed inset-0 z-50 bg-[color-mix(in_srgb,var(--foreground)_35%,transparent)] backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
          >
            <TiltCard rotationIntensity={8}>
            <div className="pointer-events-auto relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-[var(--border)] bg-[var(--muted)] shadow-[0_0_60px_rgba(var(--primary-rgb),0.2),0_25px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:rounded-3xl">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary via-accent to-primary" />
              
              {/* Close button */}
              <button
                onClick={handleMaybeLater}
                aria-label="Close tutorial welcome modal"
                className="absolute top-4 right-4 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-[var(--muted)] transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header with animation */}
              <div className="relative shrink-0 overflow-hidden border-b border-[var(--border)] bg-[var(--muted)] px-6 pb-5 pt-10 backdrop-blur-md sm:px-8 sm:pb-6">
                {/* Animated background elements */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute top-4 left-8 w-20 h-20 bg-primary/20 rounded-full blur-2xl animate-blob" />
                  <div className="absolute bottom-4 right-8 w-24 h-24 bg-accent/20 rounded-full blur-2xl animate-blob [animation-delay:2s]" />
                </div>

                {/* Icon */}
                <div className="relative flex justify-center mb-4">
                  <div className="relative">
                    <div className="w-20 h-20 bg-[var(--muted)] backdrop-blur-md shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)] border border-primary/30 rounded-2xl flex items-center justify-center">
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[color-mix(in_srgb,var(--card)_40%,transparent)] to-transparent pointer-events-none" />
                      <Sparkles className="w-10 h-10 text-primary drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.8)]" />
                    </div>
                    <div className="absolute -inset-2 rounded-3xl bg-primary/20 animate-ping" />
                  </div>
                </div>

                {/* Welcome text */}
                <div className="relative text-center">
                  <h2 className="mb-2 break-words text-2xl font-bold text-foreground drop-shadow-md">
                    Welcome{userName ? `, ${userName}` : ''}!
                  </h2>
                  <p className="break-words leading-6 text-muted-foreground">
                    You&apos;re now part of the <span className="font-semibold text-primary drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]">{roleName}</span> portal
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="min-h-0 overflow-y-auto bg-[var(--card)] px-6 py-6 sm:px-8">
                <p className="mb-6 text-center font-medium leading-6 text-muted-foreground">
                  Take a quick interactive tour to learn how to use all the features effectively.
                </p>

                {/* Feature highlights */}
                <div className="space-y-3 mb-6">
                  {[
                    'Learn to apply for and manage leave requests',
                    'Discover quick actions and shortcuts',
                    'Understand your dashboard at a glance',
                    'Master the navigation in under 2 minutes',
                  ].map((feature, index) => (
                    <motion.div
                      key={feature}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--muted)] p-3 text-sm font-medium leading-6 text-muted-foreground"
                    >
                      <CheckCircle className="w-5 h-5 text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.6)] shrink-0" />
                      <span>{feature}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <button
                    onClick={handleStartTutorial}
                    className="dropdown-shadow group relative flex min-h-12 w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-primary to-blue-600 px-6 py-4 text-center text-base font-bold leading-5 text-primary-foreground transition-[box-shadow,background-color] hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)] sm:text-lg"
                  ><div className="absolute inset-0 bg-[var(--muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Play className="w-5 h-5" />
                    Start Interactive Tour
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSkip}
                    className="glass-panel min-h-12 w-full rounded-xl border border-[var(--border)] px-6 py-4 text-center font-semibold leading-5 text-muted-foreground transition-colors hover:bg-[var(--muted)] hover:text-foreground"
                  >
                    Skip for now
                  </button>
                </div>

                <p className="text-center text-xs text-muted-foreground mt-4">
                  You can always restart the tutorial from Settings
                </p>
              </div>
            </div>
            </TiltCard>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Floating tutorial button for persistent access
interface FloatingTutorialButtonProps {
  tutorial: TutorialConfig;
}

export function FloatingTutorialButton({ tutorial }: FloatingTutorialButtonProps) {
  const { startTutorial, completedTutorials, isActive } = useTutorial();
  const [isHovered, setIsHovered] = useState(false);
  const isCompleted = completedTutorials.includes(tutorial.id);

  // Hide when tutorial is active
  if (isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 2, type: 'spring' }}
      className="fixed bottom-6 right-6 z-40"
    >
      <button
        onClick={() => startTutorial(tutorial)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-full shadow-[0_0_25px_rgba(var(--primary-rgb),0.4)] hover:shadow-[0_0_35px_rgba(var(--primary-rgb),0.6)] transition-[box-shadow,background-color] duration-200 active:scale-100"
      >
        <Play className="w-5 h-5" />
        <AnimatePresence>
          {isHovered && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="text-sm font-medium whitespace-nowrap overflow-hidden"
            >
              {isCompleted ? 'Replay Tour' : 'Start Tour'}
            </motion.span>
          )}
        </AnimatePresence>
        
        {/* Pulse indicator for new users */}
        {!isCompleted && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full notification-badge" />
        )}
      </button>
    </motion.div>
  );
}
