'use client';

import { useRef, useState, useCallback, MouseEvent as ReactMouseEvent } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  glow?: boolean;
  magneticIntensity?: number;
  children: React.ReactNode;
}

export function MagneticButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  glow = false,
  magneticIntensity = 0.3,
  className,
  children,
  disabled,
  onClick,
  ...props
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const xSpring = useSpring(x, { stiffness: 300, damping: 25 });
  const ySpring = useSpring(y, { stiffness: 300, damping: 25 });

  const handleMouseMove = useCallback((e: ReactMouseEvent<HTMLButtonElement>) => {
    if (!ref.current || disabled) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = (e.clientX - centerX) * magneticIntensity;
    const deltaY = (e.clientY - centerY) * magneticIntensity;
    x.set(deltaX);
    y.set(deltaY);
  }, [x, y, magneticIntensity, disabled]);

  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  const handleClick = useCallback((e: ReactMouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const rippleX = e.clientX - rect.left;
    const rippleY = e.clientY - rect.top;
    setRipple({ x: rippleX, y: rippleY, id: Date.now() });
    setTimeout(() => setRipple(null), 600);
    onClick?.(e);
  }, [onClick]);

  return (
    <motion.button
      ref={ref}
      style={{ x: xSpring, y: ySpring }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 rounded-xl font-semibold overflow-hidden',
        'transition-shadow duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        variant === 'primary' && 'bg-primary text-primary-foreground shadow-[0_0_0_1px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_0_25px_rgba(var(--primary-rgb),0.5),0_0_60px_rgba(var(--primary-rgb),0.2)]',
        variant === 'secondary' && 'bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/15 hover:border-white/30 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]',
        variant === 'danger' && 'bg-red-500/90 text-white hover:bg-red-500 hover:shadow-[0_0_25px_rgba(239,68,68,0.5)]',
        variant === 'success' && 'bg-emerald-500/90 text-white hover:bg-emerald-500 hover:shadow-[0_0_25px_rgba(16,185,129,0.5)]',
        variant === 'ghost' && 'text-white/80 hover:text-white hover:bg-white/10',
        variant === 'outline' && 'border border-white/20 text-white/80 bg-transparent hover:bg-white/5 hover:border-white/40 hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]',
        variant === 'gradient' && 'bg-gradient-to-r from-primary via-purple-500 to-pink-500 text-white shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_0_40px_rgba(var(--primary-rgb),0.5),0_0_80px_rgba(236,72,153,0.3)]',
        size === 'sm' && 'px-4 py-2 text-sm',
        size === 'md' && 'px-5 py-2.5 text-sm',
        size === 'lg' && 'px-7 py-3 text-base',
        glow && 'shadow-[0_0_30px_rgba(var(--primary-rgb),0.4)]',
        className
      )}
      disabled={disabled || loading}
      {...(props as any)}
    >
      {/* Ripple effect */}
      {ripple && (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/30 animate-[ripple_0.6s_ease-out_forwards] pointer-events-none"
          style={{
            left: ripple.x - 5,
            top: ripple.y - 5,
            width: 10,
            height: 10,
          }}
        />
      )}

      {/* Shimmer overlay on hover */}
      <span className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full" />

      {loading && (
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
