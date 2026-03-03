import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl mb-6">🗺️</div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Page not found</h2>
        <p className="text-gray-500 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Double-check the URL, or navigate back to your dashboard.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/"
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/employee/dashboard"
            className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            My Dashboard
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-8">
          Need help?{' '}
          <a href="mailto:support@continuum.app" className="text-blue-600 hover:underline">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
