'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';

interface AppLoadingProps {
  message?: string;
  showLogo?: boolean;
  fullScreen?: boolean;
  variant?: 'default' | 'minimal' | 'detailed';
}

const loadingSteps = [
  'Initializing application...',
  'Loading user preferences...',
  'Connecting to services...',
  'Preparing your dashboard...',
  'Almost ready!'
];

export default function AppLoading({ 
  message = "Loading Continuum...",
  showLogo = true,
  fullScreen = true,
  variant = 'default'
}: AppLoadingProps) {
  if (variant === 'minimal') {
    return (
      <div className={`${fullScreen ? 'min-h-screen' : 'min-h-[200px]'} bg-background flex items-center justify-center`}>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">{message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${fullScreen ? 'min-h-screen' : 'min-h-[400px]'} bg-background flex items-center justify-center p-4`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardContent className="pt-8 pb-8">
            <div className="text-center space-y-6">
              {/* Logo/Brand */}
              {showLogo && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="space-y-3"
                >
                  <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="text-primary-foreground text-2xl font-bold"
                    >
                      C
                    </motion.div>
                  </div>
                  <h1 className="text-xl font-semibold">Continuum</h1>
                </motion.div>
              )}

              {/* Loading Animation */}
              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-sm text-muted-foreground"
                >
                  {message}
                </motion.div>

                {/* Progress Bar */}
                <div className="w-full bg-muted rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ 
                      duration: 3,
                      ease: "easeInOut",
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                    className="bg-primary h-2 rounded-full"
                  />
                </div>

                {/* Detailed Steps (for detailed variant) */}
                {variant === 'detailed' && (
                  <div className="space-y-2 text-left">
                    {loadingSteps.map((step, index) => (
                      <motion.div
                        key={step}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.3 }}
                        className="flex items-center gap-3 text-xs text-muted-foreground"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.7 + index * 0.3 }}
                          className="w-2 h-2 bg-primary rounded-full flex-shrink-0"
                        />
                        {step}
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Spinning dots */}
                <div className="flex items-center justify-center gap-1">
                  {[0, 1, 2].map((index) => (
                    <motion.div
                      key={index}
                      initial={{ scale: 0.8, opacity: 0.3 }}
                      animate={{ 
                        scale: [0.8, 1.2, 0.8],
                        opacity: [0.3, 1, 0.3]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: index * 0.2
                      }}
                      className="w-2 h-2 bg-primary rounded-full"
                    />
                  ))}
                </div>
              </div>

              {/* Additional Info */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-xs text-muted-foreground space-y-1"
              >
                <p>Setting up your enterprise HR experience</p>
                <p>This may take a few moments...</p>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// Export additional loading variants for specific use cases
export function PageLoading({ message = "Loading page..." }: { message?: string }) {
  return <AppLoading message={message} showLogo={false} variant="minimal" fullScreen={false} />;
}

export function DashboardLoading() {
  return <AppLoading message="Loading your dashboard..." variant="detailed" />;
}

export function AuthLoading({ message = "Authenticating..." }: { message?: string }) {
  return <AppLoading message={message} variant="default" />;
}

export function ComponentLoading({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex items-center gap-3">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">{message}</span>
      </div>
    </div>
  );
}