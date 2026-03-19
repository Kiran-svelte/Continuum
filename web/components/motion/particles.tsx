'use client';

import React, { useRef, useEffect } from 'react';
import { useTheme } from 'next-themes';

interface ParticlesProps {
    numParticles?: number;
    color?: string; // CSS Variable reference like 'var(--primary)'
    size?: number;
    speed?: number;
}

export function Particles({
    numParticles = 50,
    color = 'var(--primary)',
    size = 2,
    speed = 0.5
}: ParticlesProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { theme } = useTheme();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Handle high DPI displays
        let width = typeof window !== 'undefined' ? window.innerWidth : 1000;
        let height = typeof window !== 'undefined' ? window.innerHeight : 1000;
        const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;

        const resizeCanvas = () => {
            if (typeof window === 'undefined') return;
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);
        };

        resizeCanvas();
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', resizeCanvas);
        }

        // Get exact color from CSS variable
        const getComputedColor = () => {
            if (color.startsWith('var(') && typeof document !== 'undefined') {
                const varName = color.slice(4, -1);
                const resolved = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
                if (resolved) {
                    return `hsl(${resolved})`;
                }
            }
            return '#00FFFF'; // Fallback neon cyan
        };

        let particleColor = getComputedColor();

        // Update color on theme change
        let ob: MutationObserver | null = null;
        if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') {
            ob = new MutationObserver(() => {
                particleColor = getComputedColor();
            });
            ob.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        }

        class Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            radius: number;
            alpha: number;

            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                // Float upwards generally
                this.vx = (Math.random() - 0.5) * speed;
                this.vy = (Math.random() - 0.8) * speed;
                this.radius = Math.random() * size + 0.5;
                this.alpha = Math.random() * 0.5 + 0.1;
            }

            update(mouseX: number, mouseY: number) {
                // Mouse avoidance physics
                const dx = mouseX - this.x;
                const dy = mouseY - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 100) {
                    const force = (100 - dist) / 100;
                    this.vx -= (dx / dist) * force * 0.05;
                    this.vy -= (dy / dist) * force * 0.05;
                }

                this.x += this.vx;
                this.y += this.vy;

                // Wrap around
                if (this.x < 0) this.x = width;
                if (this.x > width) this.x = 0;
                if (this.y < 0) this.y = height;
                if (this.y > height) this.y = 0;
            }

            draw(ctx: CanvasRenderingContext2D) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

                // Simple hack to apply alpha to HSL variable: Set global alpha
                ctx.globalAlpha = this.alpha;
                ctx.fillStyle = particleColor;

                ctx.fill();
                ctx.globalAlpha = 1.0; // Reset
            }
        }

        const particles: Particle[] = [];
        for (let i = 0; i < numParticles; i++) {
            particles.push(new Particle());
        }

        let mouseX = -1000;
        let mouseY = -1000;

        const handleMouseMove = (e: MouseEvent) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        };

        window.addEventListener('mousemove', handleMouseMove);

        let animationFrameId: number;

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            for (const p of particles) {
                p.update(mouseX, mouseY);
                p.draw(ctx);
            }

            // Draw connecting lines if close
            ctx.lineWidth = 0.5;
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 80) {
                        ctx.globalAlpha = (80 - dist) / 80 * 0.2;
                        ctx.strokeStyle = particleColor;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
            ctx.globalAlpha = 1.0;

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationFrameId);
            if (ob) ob.disconnect();
        };
    }, [numParticles, color, size, speed, theme]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none z-0"
            style={{ width: '100vw', height: '100vh' }}
        />
    );
}
