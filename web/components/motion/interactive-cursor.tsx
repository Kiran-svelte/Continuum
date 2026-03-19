'use client';

import { useEffect, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

export function InteractiveCursor() {
    const [isHovering, setIsHovering] = useState(false);
    const cursorX = useMotionValue(-100);
    const cursorY = useMotionValue(-100);

    // Spring handles smooth trailing motion
    const springX = useSpring(cursorX, { damping: 25, stiffness: 250, mass: 0.5 });
    const springY = useSpring(cursorY, { damping: 25, stiffness: 250, mass: 0.5 });

    // Larger secondary trailing circle
    const springX2 = useSpring(cursorX, { damping: 30, stiffness: 150, mass: 1 });
    const springY2 = useSpring(cursorY, { damping: 30, stiffness: 150, mass: 1 });

    const [mounted, setMounted] = useState(false);
    const [isTouchDevice, setIsTouchDevice] = useState(false);

    useEffect(() => {
        setMounted(true);
        setIsTouchDevice(
            typeof navigator !== 'undefined' &&
            (navigator.maxTouchPoints > 0 || 'ontouchstart' in window)
        );

        const moveCursor = (e: MouseEvent) => {
            cursorX.set(e.clientX);
            cursorY.set(e.clientY);
            // Expose to CSS variables for localized lighting
            if (typeof document !== 'undefined') {
                document.documentElement.style.setProperty('--cursor-x', `${e.clientX}px`);
                document.documentElement.style.setProperty('--cursor-y', `${e.clientY}px`);
            }
        };

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target) return;

            if (
                target.tagName?.toLowerCase() === 'button' ||
                target.tagName?.toLowerCase() === 'a' ||
                target.closest?.('button') ||
                target.closest?.('a') ||
                target.classList?.contains('interactive')
            ) {
                setIsHovering(true);
            } else {
                setIsHovering(false);
            }
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('mousemove', moveCursor);
            window.addEventListener('mouseover', handleMouseOver);
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('mousemove', moveCursor);
                window.removeEventListener('mouseover', handleMouseOver);
            }
        };
    }, [cursorX, cursorY]);

    if (!mounted || isTouchDevice) {
        return null;
    }

    return (
        <>
            <motion.div
                className="fixed top-0 left-0 w-4 h-4 rounded-full bg-primary/80 pointer-events-none z-[9999] mix-blend-difference"
                style={{
                    x: springX,
                    y: springY,
                    translateX: '-50%',
                    translateY: '-50%',
                    scale: isHovering ? 2 : 1,
                }}
                transition={{ scale: { type: 'spring', stiffness: 300, damping: 20 } }}
            />
            <motion.div
                className="fixed top-0 left-0 w-12 h-12 rounded-full border border-primary/30 pointer-events-none z-[9998]"
                style={{
                    x: springX2,
                    y: springY2,
                    translateX: '-50%',
                    translateY: '-50%',
                    scale: isHovering ? 1.5 : 1,
                    opacity: isHovering ? 0 : 1,
                }}
                transition={{ scale: { type: 'spring', stiffness: 200, damping: 20 } }}
            />
        </>
    );
}
