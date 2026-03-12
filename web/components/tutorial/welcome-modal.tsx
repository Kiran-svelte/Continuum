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
            <TiltCard rotationIntensity={8}>
            <div className="w-full max-w-lg bg-black/50 backdrop-blur-2xl border border-white/10 shadow-[0_0_60px_rgba(var(--primary-rgb),0.2),0_25px_50px_rgba(0,0,0,0.5)] rounded-3xl overflow-hidden pointer-events-auto relative">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary via-accent to-primary" />
              
              {/* Close button */}
              <button
                onClick={handleMaybeLater}
                className="absolute top-4 right-4 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header with animation */}
              <div className="relative bg-black/30 backdrop-blur-md border-b border-white/5 px-8 pt-10 pb-6 overflow-hidden">
                {/* Animated background elements */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute top-4 left-8 w-20 h-20 bg-primary/20 rounded-full blur-2xl animate-blob" />
                  <div className="absolute bottom-4 right-8 w-24 h-24 bg-accent/20 rounded-full blur-2xl animate-blob" style={{ animationDelay: '2s' }} />
                </div>

                {/* Icon */}
                <div className="relative flex justify-center mb-4">
                  <div className="relative">
                    <div className="w-20 h-20 bg-black/40 backdrop-blur-md shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)] border border-primary/30 rounded-2xl flex items-center justify-center">
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                      <Sparkles className="w-10 h-10 text-primary drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.8)]" />
                    </div>
                    <div className="absolute -inset-2 rounded-3xl bg-primary/20 animate-ping" />
                  </div>
                </div>

                {/* Welcome text */}
                <div className="relative text-center">
                  <h2 className="text-2xl font-bold text-white drop-shadow-md mb-2">
                    Welcome{userName ? `, ${userName}` : ''}!
                  </h2>
                  <p className="text-white/70">
                    You&apos;re now part of the <span className="font-semibold text-primary drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]">{roleName}</span> portal
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="px-8 py-6 bg-black/10">
                <p className="text-center text-white/60 mb-6 font-medium">
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
                      className="flex items-center gap-3 text-sm text-white/70 font-medium bg-black/20 p-3 rounded-xl border border-white/5"
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
                    className="w-full relative flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-primary to-blue-600 text-white font-bold text-lg hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)] transform hover:-translate-y-0.5 active:translate-y-0 transition-all dropdown-shadow overflow-hidden group"
                  ><div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Play className="w-5 h-5" />
                    Start Interactive Tour
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSkip}
                    className="w-full px-6 py-4 rounded-xl glass-panel border border-white/10 text-white/60 font-semibold hover:bg-white/10 hover:text-white transition-colors"
                  >
                    Skip for now
                  </button>
                </div>

                <p className="text-center text-xs text-white/40 mt-4">
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
        className="group relative flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-full shadow-[0_0_25px_rgba(var(--primary-rgb),0.4)] hover:shadow-[0_0_35px_rgba(var(--primary-rgb),0.6)] hover:scale-105 active:scale-95 transition-all duration-200"
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
