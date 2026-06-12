import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { TutorialProvider } from '@/components/tutorial/tutorial-provider';
import { AuthProvider } from '@/components/auth/auth-provider';
import { GlobalErrorBoundary } from '@/components/global-error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { ContinuumAssistantHost } from '@/components/assistant/continuum-assistant-host';
import './globals.css';

const fontSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
});

const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Continuum — Enterprise HR Management',
    template: '%s | Continuum',
  },
  description: 'Config-driven, multi-tenant, India-compliant HR platform. Manage leave policies, approvals, attendance, and payroll effortlessly.',
  keywords: [
    'leave management',
    'HR software',
    'India',
    'employee leave',
    'attendance',
    'payroll',
    'enterprise',
    'compliance',
    'HRMS',
    'leave tracking',
  ],
  authors: [{ name: 'Continuum Team' }],
  creator: 'Continuum',
  publisher: 'Continuum',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'https://continuum.support'
  ),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'Continuum — Enterprise HR Management',
    description: 'Config-driven, multi-tenant, India-compliant HR platform. Manage leave policies, approvals, and compliance effortlessly.',
    siteName: 'Continuum',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Continuum - Enterprise HR Management',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Continuum — Enterprise HR Management',
    description: 'Config-driven, multi-tenant, India-compliant HR platform.',
    images: ['/og-image.png'],
    creator: '@continuum_app',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  category: 'business',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'rgb(246 247 251)' },
    { media: '(prefers-color-scheme: dark)', color: 'rgb(9 11 16)' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${fontSans.variable} ${fontMono.variable}`}>
      <head>
        {/* Theme initialization MUST run before React hydration to prevent black screen */}
        <script src="/theme-init.js" async={false} />
        {/* cursor-effects.js stub — legacy tilt/ripple disabled */}
        <script src="/cursor-effects.js" async />
      </head>
      <body className="font-sans antialiased min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]" suppressHydrationWarning>
        <GlobalErrorBoundary>
          <ThemeProvider defaultTheme="dark" storageKey="continuum-theme">
            <AuthProvider>
              <TutorialProvider>
                {children}
              </TutorialProvider>
              <ContinuumAssistantHost />
            </AuthProvider>
            <Toaster />
          </ThemeProvider>
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
