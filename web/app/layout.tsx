import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Continuum — Enterprise AI Leave Management',
    template: '%s | Continuum',
  },
  description: 'Config-driven, multi-tenant, India-compliant, AI-powered HR platform. Manage leave policies, approvals, and compliance effortlessly. From 10 employees to 10,000.',
  keywords: [
    'leave management',
    'HR software',
    'India',
    'employee leave',
    'attendance',
    'payroll',
    'AI HR',
    'enterprise',
    'compliance',
    'HRMS',
    'leave tracking',
  ],
  authors: [{ name: 'Continuum Team' }],
  creator: 'Continuum',
  publisher: 'Continuum',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://continuum.app'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'Continuum — Enterprise AI Leave Management',
    description: 'Config-driven, multi-tenant, India-compliant, AI-powered HR platform. Manage leave policies, approvals, and compliance effortlessly.',
    siteName: 'Continuum',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Continuum - Enterprise AI Leave Management',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Continuum — Enterprise AI Leave Management',
    description: 'Config-driven, multi-tenant, India-compliant, AI-powered HR platform.',
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
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0f1c' },
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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background text-foreground transition-colors duration-300">
        <ThemeProvider defaultTheme="system" storageKey="continuum-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
