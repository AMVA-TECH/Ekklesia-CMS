import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CheckInClient } from './check-in-client';

export const instant = false;

export const metadata: Metadata = {
  title: 'Check in',
  description: 'Check in to today’s gathering with your attendance QR.',
};

/**
 * Public attendance check-in landing.
 *
 * Token arrives via `?token=` from the session QR. Church is inferred
 * server-side from the token hash — no sign-in required.
 */
export default function CheckInPage(): React.ReactElement {
  return (
    <Suspense fallback={null}>
      <CheckInClient />
    </Suspense>
  );
}
