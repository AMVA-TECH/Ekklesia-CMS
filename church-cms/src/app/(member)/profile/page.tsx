import type { Metadata } from 'next';
import { ProfileClient } from './profile-client';

export const instant = false;

export const metadata: Metadata = {
  title: 'My profile',
  description: 'Your contact details and preferences.',
};

/**
 * Member profile — view + edit.
 *
 * Only exposes the fields a member is allowed to change on themselves via
 * `PATCH /api/v1/people/me`. Admin-only fields are intentionally omitted.
 */
export default function MemberProfilePage(): React.ReactElement {
  return <ProfileClient />;
}
