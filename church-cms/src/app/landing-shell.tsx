import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { LocaleSwitcher } from '@/app/_ekklesia/i18n/locale-switcher';
import { buttonClassName } from '@/app/_ekklesia/ui';
import './landing.css';

/**
 * Landing page welcome stage (server-rendered copy for stable hydration).
 */
export async function LandingShell({
  displayClassName,
}: {
  displayClassName: string;
}): Promise<React.ReactElement> {
  const t = await getTranslations('Landing');

  return (
    <main className={`landing-stage ${displayClassName} landing-stage--ready`}>
      <div className="landing-locale">
        <LocaleSwitcher tone="dark" />
      </div>

      <div className="landing-mark-wrap">
        <Image
          src="/brand/imagery/landing-ichthys-v7.png"
          alt={t('logoAlt')}
          width={921}
          height={655}
          priority
          unoptimized
          className="landing-mark"
        />
      </div>

      <div className="landing-copy">
        <h1 className="landing-title">{t('title')}</h1>
        <p className="landing-tagline">{t('tagline')}</p>
      </div>

      <div className="landing-actions">
        <Link
          href="/sign-in"
          className={buttonClassName({
            size: 'lg',
            block: true,
            className: 'landing-sign-in',
          })}
        >
          {t('signIn')}
        </Link>
        <Link
          href="/register"
          className={buttonClassName({
            size: 'lg',
            block: true,
            variant: 'secondary',
            className: 'landing-register',
          })}
        >
          {t('register')}
        </Link>
      </div>
    </main>
  );
}
