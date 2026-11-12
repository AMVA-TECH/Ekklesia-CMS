import type { Metadata } from 'next';
import { Suspense } from 'react';
import { VerifyClient } from './verify-client';

export const instant = false;

export const metadata: Metadata = {
  title: 'Verify sign-in',
  description: 'Enter the one-time code to finish signing in.',
};

/**
 * Multi-factor verification screen.
 *
 * Reached automatically after an admin PIN succeeds and the server asks for a
 * one-time code. Members with PIN-only accounts never see this page.
 *
 * `VerifyClient` reads `useSearchParams`, so it must sit under Suspense.
 */
export default function VerifyPage(): React.ReactElement {
  return (
    <Suspense fallback={null}>
      <VerifyClient />
    </Suspense>
  );
}
