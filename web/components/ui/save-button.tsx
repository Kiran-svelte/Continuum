'use client';

import React from 'react';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SaveButtonProps {
  isSaving: boolean;
  onSave?: () => void;
  label?: string;
  disabled?: boolean;
}

/**
 * Global Save Button
 * Standardizes save actions across the application.
 * On mobile (<768px), it anchors to the bottom of the screen as a sticky bar.
 * On desktop, it renders normally (usually in a form footer or detail header).
 */
export function SaveButton({
  isSaving,
  onSave,
  label = 'Save Changes',
  disabled = false,
}: SaveButtonProps) {
  return (
    <>
      {/* Desktop Standard Rendering */}
      <Button
        onClick={onSave}
        disabled={disabled || isSaving}
        className="hidden md:flex min-w-[140px] shadow-sm transition-all hover:shadow-md"
      >
        {isSaving ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Save className="w-4 h-4 mr-2" />
        )}
        {isSaving ? 'Saving...' : label}
      </Button>

      {/* Mobile Sticky Rendering */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-[var(--background)]/90 backdrop-blur-md border-t border-[var(--border)] z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <Button
          onClick={onSave}
          disabled={disabled || isSaving}
          className="w-full h-12 text-base shadow-sm"
        >
          {isSaving ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Save className="w-5 h-5 mr-2" />
          )}
          {isSaving ? 'Saving...' : label}
        </Button>
      </div>
    </>
  );
}
