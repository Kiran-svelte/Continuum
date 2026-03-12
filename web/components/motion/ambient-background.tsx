'use client';

import { useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useTheme } from 'next-themes';

export function AmbientBackground() {
  const { theme } = useTheme();
  const { scrollY } = useScroll();
  
  // Parallax effects
  const y1 = useTransform(scrollY, [0, 1000], [0, 200]);
  const y2 = useTransform(scrollY, [0, 1000], [0, -150]);
  const rotate1 = useTransform(scrollY, [0, 1000], [0, 90]);
  
  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-50">
      {/* Background base */}
      <div className="absolute inset-0 bg-background transition-colors duration-700" />
      
      {/* Dark theme neon blobs */}
      {isDark && (
        <>
          <motion.div 
            style={{ y: y1, rotate: rotate1 }}
            className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-[rgba(0,255,255,0.03)] blur-[100px]"
          />
          <motion.div 
            style={{ y: y2 }}
            className="absolute top-[40%] -right-[20%] w-[60vw] h-[60vw] rounded-full bg-[rgba(255,0,255,0.02)] blur-[120px]"
          />
          <motion.div 
            style={{ y: y1 }}
            className="absolute -bottom-[20%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-[rgba(0,100,255,0.04)] blur-[120px]"
          />
        </>
      )}

      {/* Light theme glowing pearl blobs */}
      {!isDark && (
        <>
          <motion.div 
            style={{ y: y1, rotate: rotate1 }}
            className="absolute -top-[10%] -left-[10%] w-[40vw] h-[40vw] rounded-full bg-[rgba(0,150,255,0.05)] blur-[100px]"
          />
          <motion.div 
            style={{ y: y2 }}
            className="absolute top-[20%] -right-[10%] w-[50vw] h-[50vw] rounded-full bg-[rgba(255,100,255,0.04)] blur-[100px]"
          />
        </>
      )}
      
      {/* Noise overlay */}
      <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]" 
           style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}>
      </div>
    </div>
  );
}
