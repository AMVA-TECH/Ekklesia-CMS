import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SignInClient } from './sign-in-client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Meta');
  return {
    title: t('signInTitle'),
    description: t('signInDescription'),
  };
}

export default function SignInPage(): React.ReactElement {
  return <SignInClient />;
}
