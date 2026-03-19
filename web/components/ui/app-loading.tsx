'use client';

import { motion } from 'framer-motion';
import { GlassPanel } from '@/components/glass-panel';

interface AppLoadingProps {
  message?: string;
  showLogo?: boolean;
  fullScreen?: boolean;
  variant?: 'default' | 'minimal' | 'detailed';
}

const loadingSteps = [
  'Initializing enterprise core...',
  'Configuring secure session...',
  'Syncing global presence...',
  'Optimizing performance layers...',
  'Finalizing immersive UI...'
];

export default function AppLoading({
  message = "Continuum Engine Powering Up",
  showLogo = true,
  fullScreen = true,
  variant = 'default'
}: AppLoadingProps) {
  if (variant === 'minimal') {
    return (
      <div className={`${fullScreen ? 'min-h-screen' : 'min-h-[100px]'} flex items-center justify-center`}>
        <div className="flex flex-col items-center gap-4">
          <div className="wave-loader">
            <span></span><span></span><span></span><span></span><span></span>
          </div>
          <span className="text-xs font-medium uppercase tracking-widest text-primary animate-pulse">{message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${fullScreen ? 'min-h-screen' : 'min-h-[400px]'} flex items-center justify-center p-6 relative overflow-hidden`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg z-10"
      >
        <GlassPanel className="p-10 text-center space-y-8">
          {/* Brand Presence */}
          {showLogo && (
            <motion.div
              animate={{
                rotateY: [0, 360],
                transition: { duration: 4, repeat: Infinity, ease: "linear" }
              }}
              style={{ perspective: 1000 }}
              className="w-24 h-24 mx-auto magic-border-btn flex items-center justify-center bg-background rounded-3xl"
            >
              <span className="text-4xl font-extrabold gradient-text">C</span>
            </motion.div>
          )}

          <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-glow gradient-text">
              {message}
            </h2>

            <div className="relative h-1 w-full bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent"
              />
            </div>
          </div>

          {variant === 'detailed' && (
            <div className="space-y-3 pt-4 border-t border-border/30">
              {loadingSteps.map((step, idx) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + idx * 0.2 }}
                  className="flex items-center gap-3 text-sm text-muted-foreground/80 font-medium"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-primary glow-primary" />
                  {step}
                </motion.div>
              ))}
            </div>
          )}

          <div className="loading-dots mt-4">
            <span></span><span></span><span></span>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="text-xs uppercase tracking-tighter text-muted-foreground pt-4"
          >
            Enterprise Architecture • Continuum v1.0
          </motion.p>
        </GlassPanel>
      </motion.div>
    </div>
  );
}

export function DashboardLoading() {
  return <AppLoading message="Accessing Secure Workspace" variant="detailed" />;
}

export function AuthLoading({ message = "Validating Credentials" }: { message?: string }) {
  return <AppLoading message={message} variant="default" />;
}

export function ComponentLoading({ message = "Syncing..." }: { message?: string }) {
  return <AppLoading message={message} variant="minimal" fullScreen={false} />;
}