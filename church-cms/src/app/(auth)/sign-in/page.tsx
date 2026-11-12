import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SignInClient } from './sign-in-client';

export const instant = false;

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your Ekklesia church account.',
};

/**
 * Member + admin sign-in landing.
 *
 * One form, one screen: identifier (phone or email) + PIN, plus a path to
 * the MFA OTP screen for admins. All copy stays plain and welcoming — no
 * finance / admin language leaks into the first impression.
 *
 * `SignInClient` reads `useSearchParams`, so it must sit under Suspense
 * to avoid blocking the static shell during prerender.
 */
export default function SignInPage(): React.ReactElement {
  return (
    <Suspense fallback={null}>
      <SignInClient />
    </Suspense>
  );
}
