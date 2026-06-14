'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface AdaptiveFieldProps {
  label?: string;
  value: string;
  type?: 'text' | 'number' | 'email';
  onSave: (val: string) => Promise<void> | void;
  className?: string;
}

/**
 * Global Adaptive Field
 * Enterprise pattern for data entry. Renders as text until clicked,
 * then becomes an input. Saves on enter or check click.
 */
export function AdaptiveField({
  label,
  value,
  type = 'text',
  onSave,
  className = '',
}: AdaptiveFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (currentValue === value) {
      setIsEditing(false);
      return;
    }
    
    setIsSaving(true);
    try {
      await onSave(currentValue);
      setIsEditing(false);
    } catch (error) {
      // Revert on failure
      setCurrentValue(value);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      void handleSave();
    } else if (e.key === 'Escape') {
      setCurrentValue(value);
      setIsEditing(false);
    }
  };

  if (!isEditing) {
    return (
      <div className={`group flex flex-col gap-1 ${className}`}>
        {label && <span className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">{label}</span>}
        <div 
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-2 cursor-pointer py-1 px-1.5 -ml-1.5 rounded hover:bg-[var(--secondary)] transition-colors"
        >
          <span className="text-[var(--foreground)] font-medium">
            {value || <span className="text-[var(--muted-foreground)] italic">Not set</span>}
          </span>
          <Pencil className="w-3.5 h-3.5 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <span className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">{label}</span>}
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          type={type}
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          className="h-8 py-1 text-sm bg-[var(--card)]"
        />
        <div className="flex items-center gap-0.5">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="p-1.5 rounded text-[var(--status-success)] hover:bg-[var(--secondary)] transition-colors disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setCurrentValue(value);
              setIsEditing(false);
            }}
            disabled={isSaving}
            className="p-1.5 rounded text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--status-danger)] transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
