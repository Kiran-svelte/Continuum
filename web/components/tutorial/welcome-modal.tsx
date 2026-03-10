'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="w-full max-w-lg rounded-2xl bg-card shadow-2xl border border-border overflow-hidden pointer-events-auto">
              {/* Close button */}
              <button
                onClick={handleMaybeLater}
                className="absolute top-4 right-4 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header with animation */}
              <div className="relative bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 px-8 pt-10 pb-6 overflow-hidden">
                {/* Animated background elements */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute top-4 left-8 w-20 h-20 bg-primary/10 rounded-full blur-2xl animate-blob" />
                  <div className="absolute bottom-4 right-8 w-24 h-24 bg-accent/10 rounded-full blur-2xl animate-blob" style={{ animationDelay: '2s' }} />
                </div>

                {/* Icon */}
                <div className="relative flex justify-center mb-4">
                  <div className="relative">
                    <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <Sparkles className="w-10 h-10 text-primary" />
                    </div>
                    <div className="absolute -inset-2 rounded-3xl bg-primary/5 animate-ping" />
                  </div>
                </div>

                {/* Welcome text */}
                <div className="relative text-center">
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Welcome{userName ? `, ${userName}` : ''}!
                  </h2>
                  <p className="text-muted-foreground">
                    You&apos;re now part of the <span className="font-semibold text-primary">{roleName}</span> portal
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="px-8 py-6">
                <p className="text-center text-muted-foreground mb-6">
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
                      className="flex items-center gap-3 text-sm text-muted-foreground"
                    >
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      <span>{feature}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <button
                    onClick={handleStartTutorial}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 btn-press"
                  >
                    <Play className="w-5 h-5" />
                    Start Interactive Tour
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSkip}
                    className="w-full px-6 py-3 rounded-xl border border-border text-muted-foreground font-medium hover:bg-muted/50 transition-colors"
                  >
                    Skip for now
                  </button>
                </div>

                <p className="text-center text-xs text-muted-foreground mt-4">
                  You can always restart the tutorial from Settings
                </p>
              </div>
            </div>
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
        className="group relative flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all btn-press"
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
