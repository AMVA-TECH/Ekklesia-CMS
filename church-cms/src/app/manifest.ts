import type { MetadataRoute } from 'next';

/**
 * Web app manifest — install icons point at the approved dark squircle mark.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ekklesia',
    short_name: 'Ekklesia',
    description:
      'Ekklesia is a church management system for members, ministries, events and care.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F7F8F6',
    theme_color: '#F7F8F6',
    icons: [
      {
        src: '/branding/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/branding/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/branding/ekklesia-logo-dark.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
