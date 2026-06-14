'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X, Lightbulb } from 'lucide-react';

interface HelpTooltipProps {
  title: string;
  content: string;
  tips?: string[];
  position?: 'top' | 'bottom' | 'left' | 'right';
  children?: React.ReactNode;
}

export function HelpTooltip({ 
  title, 
  content, 
  tips, 
  position = 'top',
  children 
}: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'bottom-[-6px] left-1/2 -translate-x-1/2 border-t-[#e8e4f5]',
    bottom: 'top-[-6px] left-1/2 -translate-x-1/2 border-b-[#e8e4f5] rotate-180',
    left: 'right-[-6px] top-1/2 -translate-y-1/2 border-l-[#e8e4f5] -rotate-90',
    right: 'left-[-6px] top-1/2 -translate-y-1/2 border-r-[#e8e4f5] rotate-90'
  };

  return (
    <div className="relative inline-flex" ref={tooltipRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded-full hover:bg-[var(--muted)] transition-colors text-muted-foreground hover:text-foreground/80"
        aria-label="Help"
      >
        {children || <HelpCircle className="w-4 h-4" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 w-72 ${positionClasses[position]}`}
          >
            {/* Arrow */}
            <div className={`absolute w-0 h-0 border-8 border-transparent ${arrowClasses[position]}`} />
            
            {/* Content */}
            <div className="bg-[var(--muted)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-3 border-b border-[var(--border)] bg-primary/10">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-[#6C63FF]" />
                  <span className="font-semibold text-sm text-foreground">{title}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close help tooltip"
                  className="p-1 rounded hover:bg-[var(--muted)] transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>

              {/* Body */}
              <div className="p-3">
                <p className="text-sm text-muted-foreground leading-relaxed">{content}</p>
                
                {tips && tips.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[var(--border)]">
                    <p className="text-xs font-semibold text-primary mb-2">💡 Quick Tips</p>
                    <ul className="space-y-1.5">
                      {tips.map((tip, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <span className="text-[#00E682] mt-0.5">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Pre-defined help content for common UI elements
export const HELP_CONTENT = {
  leaveBalance: {
    title: 'Leave Balance',
    content: 'This shows your available leave days for the current year. The balance is calculated as: Annual entitlement + Carried forward - Used - Pending.',
    tips: [
      'Hover over each leave type to see detailed breakdown',
      'Unused leave may carry forward based on company policy',
      'Some leave types expire at year end'
    ]
  },
  applyLeave: {
    title: 'Apply for Leave',
    content: 'Submit a leave request for approval. Choose your leave type, dates, and provide a reason for your absence.',
    tips: [
      'Check your balance before applying',
      'Apply at least 3 days in advance for planned leave',
      'Emergency leave can be applied retroactively'
    ]
  },
  approvals: {
    title: 'Approval Queue',
    content: 'These are leave requests waiting for your approval. Review each request and approve or reject within the SLA.',
    tips: [
      'Click on a request to see full details',
      'Use bulk actions for multiple approvals',
      'Requests escalate if not actioned in 48 hours'
    ]
  },
  teamCalendar: {
    title: 'Team Calendar',
    content: 'Visual overview of your team\'s availability. See who\'s on leave, upcoming holidays, and plan team activities.',
    tips: [
      'Click on a date to see detailed view',
      'Use filters to show specific leave types',
      'Export calendar to PDF or sync with Google Calendar'
    ]
  },
  notifications: {
    title: 'Notifications',
    content: 'Real-time updates about your leave requests, approvals, and important announcements from HR.',
    tips: [
      'Click on a notification to mark as read',
      'Configure notification preferences in Settings',
      'Enable push notifications for urgent updates'
    ]
  },
  reports: {
    title: 'Reports',
    content: 'Generate and export attendance and leave reports. Filter by date range, department, or employee.',
    tips: [
      'Schedule automatic report generation',
      'Export to CSV or PDF',
      'Share reports via email directly'
    ]
  }
};
