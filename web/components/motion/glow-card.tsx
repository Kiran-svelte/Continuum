'use client';

import { useRef, useCallback, MouseEvent, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  glowColors?: [string, string];
  borderRadius?: string;
  color?: string; // Simple color prop (converts to glowColors)
}

export function GlowCard({
  children,
  className,
  glowColors,
  color,
  borderRadius = '1rem',
}: GlowCardProps) {
  // If color prop is provided, derive glow colors from it
  const effectiveGlowColors: [string, string] = glowColors 
    ?? (color ? [color, color.replace(/0\.\d+\)$/, '0.8)')] : ['rgba(0,255,255,0.6)', 'rgba(236,72,153,0.6)']);
  
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const smoothX = useSpring(mouseX, { stiffness: 200, damping: 30 });
  const smoothY = useSpring(mouseY, { stiffness: 200, damping: 30 });

  const rotateX = useSpring(0, { stiffness: 200, damping: 30 });
  const rotateY = useSpring(0, { stiffness: 200, damping: 30 });

  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    mouseX.set(x);
    mouseY.set(y);
    rotateX.set((y - 0.5) * -8);
    rotateY.set((x - 0.5) * 8);
  }, [mouseX, mouseY, rotateX, rotateY]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    mouseX.set(0.5);
    mouseY.set(0.5);
    rotateX.set(0);
    rotateY.set(0);
  }, [mouseX, mouseY, rotateX, rotateY]);

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        borderRadius,
      }}
      className={cn('relative group', className)}
    >
      {/* Animated gradient border */}
      <motion.div
        className="absolute -inset-[1px] rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: isHovered
            ? `radial-gradient(circle at ${smoothX.get() * 100}% ${smoothY.get() * 100}%, ${effectiveGlowColors[0]}, ${effectiveGlowColors[1]}, transparent 70%)`
            : `conic-gradient(from 0deg, ${effectiveGlowColors[0]}, ${effectiveGlowColors[1]}, ${effectiveGlowColors[0]})`,
          borderRadius: 'inherit',
        }}
      />

      {/* Rotating gradient border (idle animation) */}
      <div
        className="absolute -inset-[1px] rounded-[inherit] opacity-30 group-hover:opacity-0 transition-opacity duration-500 pointer-events-none animate-[border-rotate_4s_linear_infinite]"
        style={{
          background: `conic-gradient(from var(--border-angle, 0deg), transparent 40%, ${effectiveGlowColors[0]} 50%, ${effectiveGlowColors[1]} 60%, transparent 70%)`,
          borderRadius: 'inherit',
        }}
      />

      {/* Glow halo */}
      <div
        className="absolute -inset-4 rounded-[inherit] opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${effectiveGlowColors[0]}20, transparent 70%)`,
        }}
      />

      {/* Inner content */}
      <div
        className="relative rounded-[inherit] bg-black/40 backdrop-blur-xl border border-white/10 overflow-hidden"
        style={{ transform: 'translateZ(10px)' }}
      >
        {children}
      </div>
    </motion.div>
  );
}
