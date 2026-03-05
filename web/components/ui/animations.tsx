'use client';

import { motion, AnimatePresence, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

// Animation variants
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

export const slideIn: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, x: 20, transition: { duration: 0.2 } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// Animated page wrapper
interface AnimatedPageProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedPage({ children, className }: AnimatedPageProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={fadeIn}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Animated card with hover effects
interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  interactive?: boolean;
  onClick?: () => void;
}

export function AnimatedCard({
  children,
  className,
  delay = 0,
  interactive = false,
  onClick,
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      whileHover={interactive ? { y: -4, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' } : undefined}
      whileTap={interactive ? { scale: 0.98 } : undefined}
      className={cn(
        'rounded-xl border border-border bg-card transition-colors',
        interactive && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

// Staggered list
interface StaggeredListProps {
  children: ReactNode;
  className?: string;
}

export function StaggeredList({ children, className }: StaggeredListProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggeredItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}

// Number counter animation
interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function AnimatedNumber({
  value,
  duration = 1,
  className,
  prefix = '',
  suffix = '',
}: AnimatedNumberProps) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={className}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: duration / 2 }}
      >
        {prefix}
      </motion.span>
      <motion.span
        initial={{ value: 0 }}
        animate={{ value }}
        transition={{ duration, ease: 'easeOut' }}
      >
        {value}
      </motion.span>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: duration / 2, delay: duration / 2 }}
      >
        {suffix}
      </motion.span>
    </motion.span>
  );
}

// Animated presence wrapper for conditional rendering
interface AnimatedPresenceWrapperProps {
  children: ReactNode;
  show: boolean;
  className?: string;
  animation?: 'fade' | 'slide' | 'scale';
}

export function AnimatedPresenceWrapper({
  children,
  show,
  className,
  animation = 'fade',
}: AnimatedPresenceWrapperProps) {
  const variants = {
    fade: fadeIn,
    slide: slideUp,
    scale: scaleIn,
  };

  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={variants[animation]}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Floating action button with animation
interface FloatingActionButtonProps {
  onClick: () => void;
  icon: ReactNode;
  className?: string;
  tooltip?: string;
}

export function FloatingActionButton({
  onClick,
  icon,
  className,
  tooltip,
}: FloatingActionButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={cn(
        'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-shadow',
        className
      )}
      title={tooltip}
    >
      {icon}
    </motion.button>
  );
}

// Pulse animation for notifications
export function PulseIndicator({ className }: { className?: string }) {
  return (
    <span className={cn('relative flex h-3 w-3', className)}>
      <motion.span
        animate={{ scale: [1, 1.5], opacity: [0.75, 0] }}
        transition={{ duration: 1, repeat: Infinity }}
        className="absolute inline-flex h-full w-full rounded-full bg-primary"
      />
      <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
    </span>
  );
}

// Shimmer effect component
export function Shimmer({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn('absolute inset-0 overflow-hidden', className)}
      initial={{ x: '-100%' }}
      animate={{ x: '100%' }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
    >
      <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </motion.div>
  );
}

// 3D Card effect
interface Card3DProps {
  children: ReactNode;
  className?: string;
}

export function Card3D({ children, className }: Card3DProps) {
  return (
    <motion.div
      className={cn('relative rounded-xl', className)}
      whileHover={{
        rotateX: 5,
        rotateY: 5,
        scale: 1.02,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{
        transformStyle: 'preserve-3d',
        perspective: 1000,
      }}
    >
      {children}
    </motion.div>
  );
}

// Expanding card animation
interface ExpandingCardProps {
  children: ReactNode;
  expandedContent: ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  className?: string;
}

export function ExpandingCard({
  children,
  expandedContent,
  isExpanded,
  onToggle,
  className,
}: ExpandingCardProps) {
  return (
    <motion.div
      layout
      className={cn('rounded-xl border border-border bg-card overflow-hidden', className)}
      onClick={onToggle}
    >
      <motion.div layout="position">{children}</motion.div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {expandedContent}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
