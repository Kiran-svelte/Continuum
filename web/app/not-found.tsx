import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl mb-6">🗺️</div>
        <h1 className="text-4xl font-bold text-foreground mb-3">404</h1>
        <h2 className="text-xl font-semibold text-muted-foreground mb-4">Page not found</h2>
        <p className="text-muted-foreground mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Double-check the URL, or navigate back to your dashboard.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/"
            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/employee/dashboard"
            className="border border-border text-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
          >
            My Dashboard
          </Link>
        </div>
        <p className="text-xs text-muted-foreground mt-8">
          Need help?{' '}
          <a href="mailto:support@continuum.app" className="text-primary hover:underline">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
