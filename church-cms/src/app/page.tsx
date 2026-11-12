import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandMark, buttonClassName } from '@/app/_ekklesia/ui';

export const metadata: Metadata = {
  title: 'Ekklesia',
  description:
    'Ekklesia is a church management system for members, ministries, events and care.',
};

/**
 * Root landing.
 *
 * Intentionally tiny: a branded splash that points to sign-in. This is not a
 * marketing surface (per Checkpoint A Q4) — it exists so that someone who
 * types the domain into their phone lands on something recognisably Ekklesia
 * instead of a redirect flash. Nothing admin-shaped is pulled in here.
 */
export default function RootLandingPage(): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-10 bg-background px-6 py-12 text-center text-foreground">
      <BrandMark size={56} variant="logo" surface="light" />

      <div className="flex max-w-lg flex-col items-center gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Welcome to your church home.
        </h1>
        <p className="text-base text-muted-foreground">
          Stay in touch, join events, support your ministry, and keep your giving
          on track — all in one calm place, on any phone.
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <Link href="/sign-in" className={buttonClassName({ size: 'lg', block: true })}>
          Sign in
        </Link>
        <Link
          href="/sign-in?help=1"
          className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-ring rounded-sm"
        >
          First time? Ask your church office
        </Link>
      </div>

      <p className="mt-auto text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Ekklesia</span> ·
        built for the local church
      </p>
    </div>
  );
}
