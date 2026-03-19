'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GlassPanel } from "@/components/glass-panel";
import { Button } from '@/components/ui/button';

interface NavigationSuggestion {
  label: string;
  href: string;
  description: string;
  icon: string;
}

export default function NotFound() {
  const [suggestions, setSuggestions] = useState<NavigationSuggestion[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    const newSuggestions: NavigationSuggestion[] = [
      {
        label: 'Central Hub',
        href: '/',
        description: 'Primary operations center',
        icon: '🏚️'
      }
    ];

    if (currentPath.includes('/employee')) {
      newSuggestions.push({
        label: 'Employee Portal',
        href: '/employee/dashboard',
        description: 'Your personal workspace',
        icon: '👤'
      });
    }

    if (currentPath.includes('/hr')) {
      newSuggestions.push({
        label: 'HR Command',
        href: '/hr/dashboard',
        description: 'Organization management',
        icon: '📊'
      });
    }

    newSuggestions.push(
      {
        label: 'Support Link',
        href: '/support',
        description: 'Technical assistance',
        icon: '📡'
      }
    );

    setSuggestions(newSuggestions);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-xl z-10"
      >
        <GlassPanel>
          <div className="p-10 border-b border-border/30 text-center space-y-4">
            <motion.div
              animate={{ rotateY: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="text-7xl mb-4 inline-block"
            >
              🛸
            </motion.div>
            <h1 className="text-3xl font-extrabold tracking-tight text-glow gradient-text">
              Sector Missing
            </h1>
            <p className="text-muted-foreground/80 max-w-xs mx-auto">
              Our sensors cannot find the requested coordinates in the enterprise grid.
            </p>
          </div>

          <div className="p-10 space-y-10">
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-primary/80">Available Uplinks</h3>
              <div className="grid gap-3">
                {suggestions.map((item, idx) => (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * idx }}
                    className="glass-card hover:translate-x-2 transition-all p-4 border border-border/20 group cursor-pointer"
                  >
                    <Link href={item.href} className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{item.icon}</span>
                        <div>
                          <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                            {item.label}
                          </p>
                          <p className="text-[10px] uppercase tracking-tighter text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-border/20">
              <Button
                onClick={() => window.history.back()}
                variant="outline"
                className="flex-1 h-12 text-sm font-bold uppercase tracking-widest rounded-2xl border-border/40"
              >
                Retrace Steps
              </Button>
              <Link href="/" className="flex-1">
                <Button className="magic-border-btn w-full h-12 text-sm font-bold uppercase tracking-widest">
                  Base Command
                </Button>
              </Link>
            </div>
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
}
