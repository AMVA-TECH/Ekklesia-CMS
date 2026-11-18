import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Cinzel } from 'next/font/google';
import { getTranslations } from 'next-intl/server';
import { LandingShell } from './landing-shell';

const landingDisplay = Cinzel({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-landing-display',
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Meta');
  return {
    title: t('homeTitle'),
    description: t('homeDescription'),
  };
}

export const viewport: Viewport = {
  themeColor: '#0a0b10',
  colorScheme: 'dark',
};

/** Root landing welcome stage. */
export default function RootLandingPage(): React.ReactElement {
  return (
    <Suspense fallback={null}>
      <LandingShell displayClassName={landingDisplay.variable} />
    </Suspense>
  );
}
