'use client';

import { useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion';
import { useTheme } from 'next-themes';
import { Particles } from './particles';

// We introduce a Particles component below to handle beautiful floating dots

export function AmbientBackground() {
  const { theme } = useTheme();
  const { scrollY } = useScroll();
  const [mounted, setMounted] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Spring physics for mouse following blobs
  const springX = useSpring(mouseX, { stiffness: 40, damping: 30, mass: 1.5 });
  const springY = useSpring(mouseY, { stiffness: 40, damping: 30, mass: 1.5 });

  // Deep Parallax effects based on scroll
  const y1 = useTransform(scrollY, [0, 2000], [0, 600]);
  const y2 = useTransform(scrollY, [0, 2000], [0, -400]);
  const y3 = useTransform(scrollY, [0, 2000], [0, 800]);
  const rotate1 = useTransform(scrollY, [0, 2000], [0, 180]);
  const rotate2 = useTransform(scrollY, [0, 2000], [0, -180]);
  const scale1 = useTransform(scrollY, [0, 1000], [1, 1.2]);

  useEffect(() => {
    setMounted(true);
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse coordinates -50vw to 50vw
      mouseX.set(e.clientX - window.innerWidth / 2);
      mouseY.set(e.clientY - window.innerHeight / 2);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  if (!mounted) return null;

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-50] bg-background transition-colors duration-1000">

      {/* 3D Depth Layer 1: Distant Particles */}
      <Particles
        numParticles={isDark ? 120 : 60}
        color={isDark ? 'var(--primary)' : 'var(--primary)'}
        size={isDark ? 1.5 : 2}
        speed={0.3}
      />

      {/* 3D Depth Layer 2: Mouse Tracking Interactive Core Glow (Follows cursor) */}
      <motion.div
        style={{ x: springX, y: springY }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] rounded-full blur-[200px] opacity-30 mix-blend-screen"
        animate={{
          background: isDark
            ? 'radial-gradient(circle, hsl(var(--primary)/0.2) 0%, transparent 60%)'
            : 'radial-gradient(circle, hsl(var(--primary)/0.1) 0%, transparent 60%)'
        }}
        transition={{ duration: 2 }}
      />

      {/* 3D Depth Layer 3: Main Parallax Blobs */}
      {isDark ? (
        <>
          <motion.div
            style={{ y: y1, rotate: rotate1, scale: scale1 }}
            className="absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] rounded-full opacity-60 mix-blend-color-dodge blur-[120px]"
            animate={{ background: 'radial-gradient(circle, hsl(var(--primary)/0.3), transparent 70%)' }}
          />
          <motion.div
            style={{ y: y2, rotate: rotate2 }}
            className="absolute top-[40%] -right-[20%] w-[50vw] h-[50vw] rounded-full opacity-50 mix-blend-color-dodge blur-[140px]"
            animate={{ background: 'radial-gradient(circle, hsl(var(--accent)/0.25), transparent 70%)' }}
          />
          <motion.div
            style={{ y: y3 }}
            className="absolute -bottom-[20%] left-[30%] w-[45vw] h-[45vw] rounded-full opacity-40 mix-blend-screen blur-[130px]"
            animate={{ background: 'radial-gradient(circle, hsl(190, 90%, 55%, 0.2), transparent 70%)' }}
          />
        </>
      ) : (
        <>
          {/* Light Theme "Pearl" Glass Glows */}
          <motion.div
            style={{ y: y1, rotate: rotate1, scale: scale1 }}
            className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] rounded-full blur-[100px] opacity-40 mix-blend-multiply"
            animate={{ background: 'radial-gradient(circle, hsl(var(--primary)/0.15), transparent 70%)' }}
          />
          <motion.div
            style={{ y: y2, rotate: rotate2 }}
            className="absolute top-[30%] -right-[10%] w-[60vw] h-[60vw] rounded-full blur-[120px] opacity-40 mix-blend-multiply"
            animate={{ background: 'radial-gradient(circle, hsl(var(--accent)/0.1), transparent 70%)' }}
          />
        </>
      )}

      {/* Top Layer: Subtle Cybergrid or Noise texture for tactile feel */}
      <div className="absolute inset-0 z-10 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
          mixBlendMode: isDark ? 'overlay' : 'multiply'
        }}>
      </div>

      {/* Horizontal Light Scanline (Cyberpunk touch for dark mode) */}
      {isDark && <div className="scanline" />}
    </div>
  );
}
