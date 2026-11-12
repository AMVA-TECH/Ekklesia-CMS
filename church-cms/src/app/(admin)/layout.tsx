import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AdminProviders } from './_components/admin-providers';

export const metadata: Metadata = {
  title: {
    default: 'Admin',
    template: '%s · Admin',
  },
  description: 'Ekklesia admin console — people, ministries, giving, care.',
};

/**
 * Root layout for the `(admin)` route group.
 *
 * Intentionally a thin server component — the heavy lifting (session
 * bootstrap, toast provider, shell chrome, nav groups) lives in
 * `<AdminProviders>` so it can be a client component without forcing every
 * child page to opt in.
 */
export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return <AdminProviders>{children}</AdminProviders>;
}
