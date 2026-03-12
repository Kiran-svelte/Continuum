'use client';

import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { useEffect, useCallback } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  className,
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
}: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    },
    [onClose, closeOnEscape]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Glass backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={closeOnOverlayClick ? onClose : undefined}
            aria-hidden="true"
          />

          {/* Modal content with glass morphism */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 30,
            }}
            className={cn(
              'relative w-full rounded-2xl overflow-hidden',
              'bg-card/95 dark:bg-black/70 backdrop-blur-xl',
              'border border-white/10 dark:border-white/10',
              'shadow-2xl dark:shadow-[0_0_60px_rgba(0,0,0,0.5),0_0_30px_rgba(var(--primary-rgb),0.1)]',
              sizeStyles[size],
              className
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            aria-describedby={description ? 'modal-description' : undefined}
          >
            {/* Gradient top stripe */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/60 via-accent/60 to-primary/60" />

            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-start justify-between px-6 py-4 border-b border-white/10">
                <div>
                  {title && (
                    <h2
                      id="modal-title"
                      className="text-lg font-semibold text-foreground dark:text-white"
                    >
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p
                      id="modal-description"
                      className="mt-1 text-sm text-muted-foreground dark:text-white/60"
                    >
                      {description}
                    </p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all duration-200"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {/* Body */}
            <div className="px-6 py-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ModalFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10',
        'bg-white/5 dark:bg-white/5 rounded-b-2xl -mx-6 -mb-4',
        className
      )}
    >
      {children}
    </div>
  );
}

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  const variantStyles = {
    danger: 'bg-red-500/90 text-white hover:bg-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]',
    warning: 'bg-amber-500/90 text-white hover:bg-amber-500 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]',
    info: 'bg-blue-500/90 text-white hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      <div className="text-center py-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
          className={cn(
            'mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4',
            variant === 'danger' && 'bg-red-500/15 shadow-[0_0_20px_rgba(239,68,68,0.2)]',
            variant === 'warning' && 'bg-amber-500/15 shadow-[0_0_20px_rgba(245,158,11,0.2)]',
            variant === 'info' && 'bg-blue-500/15 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
          )}
        >
          {variant === 'danger' && <AlertTriangle className="w-7 h-7 text-red-400" />}
          {variant === 'warning' && <AlertCircle className="w-7 h-7 text-amber-400" />}
          {variant === 'info' && <Info className="w-7 h-7 text-blue-400" />}
        </motion.div>
        <h3 className="text-lg font-semibold text-foreground dark:text-white mb-2">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground dark:text-white/60">{description}</p>
        )}
      </div>
      <div className="flex gap-3 mt-4">
        <button
          onClick={onClose}
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-xl border border-white/20 text-foreground dark:text-white/80 hover:bg-white/10 transition-all duration-200 disabled:opacity-50 font-medium"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={cn(
            'flex-1 px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50',
            variantStyles[variant]
          )}
        >
          {loading ? 'Loading...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
