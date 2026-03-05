import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://continuum.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  // Public pages that should be indexed
  const publicPages = [
    {
      url: BASE_URL,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/status`,
      lastModified,
      changeFrequency: 'hourly' as const,
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/sign-in`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/sign-up`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/forgot-password`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
    // Legal pages
    {
      url: `${BASE_URL}/privacy`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/cookies`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    },
    // Support pages
    {
      url: `${BASE_URL}/support`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/help`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    },
  ];

  return publicPages;
}
