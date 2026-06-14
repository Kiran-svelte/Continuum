'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            Our team has been notified. You can try again or refresh the page.
          </p>
          <div className="flex gap-2 justify-center">
            <Button type="button" onClick={() => reset()}>
              Try again
            </Button>
            <Button type="button" variant="outline" onClick={() => window.location.reload()}>
              Refresh
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
