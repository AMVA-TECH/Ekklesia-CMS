import type { ReactNode } from 'react';
import { MemberShellMount } from './member-shell-mount';

/**
 * Member routes need a session before chrome is useful. Opt out of Next.js
 * instant-navigation validation so auth gating does not thrash the router.
 * @see https://nextjs.org/docs/messages/instant-unrendered-segment
 */
export const instant = false;

/**
 * Member route-group layout.
 *
 * Mounts the shared `MemberShell` wrapped in `SessionProvider` and
 * `ToastProvider`. Unauthenticated visitors are redirected to `/sign-in`.
 */
export default function MemberLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return <MemberShellMount>{children}</MemberShellMount>;
}
