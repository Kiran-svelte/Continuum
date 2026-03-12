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
}

export default function NotFound() {
  const [suggestions, setSuggestions] = useState<NavigationSuggestion[]>([]);
  const [referrer, setReferrer] = useState<string>('');

  useEffect(() => {
    // Track referrer for analytics
    setReferrer(document.referrer || 'Direct access');

    // Generate contextual navigation suggestions based on current path
    const currentPath = window.location.pathname;
    const newSuggestions: NavigationSuggestion[] = [
      {
        label: 'Home',
        href: '/',
        description: 'Return to the homepage'
      }
    ];

    // Add role-specific suggestions based on attempted path
    if (currentPath.includes('/employee')) {
      newSuggestions.push({
        label: 'Employee Dashboard',
        href: '/employee/dashboard',
        description: 'Access your employee portal'
      });
    }
    
    if (currentPath.includes('/hr')) {
      newSuggestions.push({
        label: 'HR Dashboard',
        href: '/hr/dashboard',
        description: 'Access HR management tools'
      });
    }
    
    if (currentPath.includes('/manager')) {
      newSuggestions.push({
        label: 'Manager Dashboard',
        href: '/manager/dashboard',
        description: 'Access team management tools'
      });
    }

    // Always add help and support
    newSuggestions.push(
      {
        label: 'Help Center',
        href: '/help',
        description: 'Browse documentation and guides'
      },
      {
        label: 'Contact Support',
        href: '/support',
        description: 'Get assistance from our team'
      }
    );

    setSuggestions(newSuggestions);

    // Log 404 for analytics (in production, send to monitoring service)
    console.warn('404 Page Not Found:', {
      path: currentPath,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    });
  }, []);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg"
      >
        <GlassPanel>
          <div className="p-6 border-b border-white/10 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="text-6xl mb-4"
            >
              🗺️
            </motion.div>
            <h3 className="text-xl font-semibold text-white">Page Not Found</h3>
            <p className="text-white/60 mt-2">
              The page you&rsquo;re looking for doesn&rsquo;t exist or has been moved.
            </p>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Current path info for development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-white/5 rounded-lg p-3">
                <h4 className="text-sm font-medium mb-2">Debug Info (Development)</h4>
                <div className="text-xs text-white/60 space-y-1">
                  <div><strong>Path:</strong> {typeof window !== 'undefined' ? window.location.pathname : 'Unknown'}</div>
                  <div><strong>Search:</strong> {typeof window !== 'undefined' ? window.location.search || 'None' : 'Unknown'}</div>
                  <div><strong>Referrer:</strong> {referrer || 'Direct'}</div>
                </div>
              </div>
            )}

            {/* Navigation suggestions */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Where would you like to go?</h3>
              <div className="grid gap-2">
                {suggestions.map((suggestion, index) => (
                  <motion.div
                    key={suggestion.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <Link href={suggestion.href}>
                      <div className="border rounded-lg p-3 hover:bg-white/5 transition-colors group cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm group-hover:text-primary transition-colors">
                              {suggestion.label}
                            </div>
                            <div className="text-xs text-white/60">
                              {suggestion.description}
                            </div>
                          </div>
                          <svg 
                            className="w-4 h-4 text-white/60 group-hover:text-primary transition-colors" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <Button 
                onClick={() => window.history.back()}
                variant="outline" 
                className="flex items-center gap-2 flex-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                </svg>
                Go Back
              </Button>
              <Link href="/">
                <Button className="flex items-center gap-2 flex-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Home
                </Button>
              </Link>
            </div>

            {/* Contact support */}
            <div className="text-center pt-2">
              <p className="text-xs text-white/60">
                Still can&rsquo;t find what you&rsquo;re looking for?{' '}
                <a 
                  href="mailto:support@continuum-hr.com" 
                  className="text-primary hover:underline"
                >
                  Contact our support team
                </a>
              </p>
            </div>
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
}
