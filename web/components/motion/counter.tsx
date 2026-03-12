'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform, useInView } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CounterProps {
  value: number;
  format?: 'integer' | 'currency' | 'percent' | 'compact';
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
  triggerOnView?: boolean;
}

export function Counter({
  value,
  format = 'integer',
  prefix = '',
  suffix = '',
  duration = 1.5,
  className,
  triggerOnView = true,
}: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [hasStarted, setHasStarted] = useState(!triggerOnView);

  const spring = useSpring(0, {
    stiffness: 50,
    damping: 25,
    duration: duration * 1000,
  });

  const display = useTransform(spring, (latest) => {
    const rounded = Math.round(latest);
    switch (format) {
      case 'currency':
        return `${prefix}${rounded.toLocaleString()}${suffix}`;
      case 'percent':
        return `${prefix}${rounded}%${suffix}`;
      case 'compact':
        if (rounded >= 1000000) return `${prefix}${(rounded / 1000000).toFixed(1)}M${suffix}`;
        if (rounded >= 1000) return `${prefix}${(rounded / 1000).toFixed(1)}K${suffix}`;
        return `${prefix}${rounded}${suffix}`;
      default:
        return `${prefix}${rounded.toLocaleString()}${suffix}`;
    }
  });

  useEffect(() => {
    if (triggerOnView && isInView) {
      setHasStarted(true);
    }
  }, [isInView, triggerOnView]);

  useEffect(() => {
    if (hasStarted) {
      spring.set(value);
    }
  }, [spring, value, hasStarted]);

  return (
    <motion.span
      ref={ref}
      className={cn('tabular-nums font-bold', className)}
    >
      {display}
    </motion.span>
  );
}
