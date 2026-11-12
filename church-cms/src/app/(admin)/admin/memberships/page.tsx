import type { Metadata } from 'next';
import { MembershipsClient } from './memberships-client';

export const metadata: Metadata = {
  title: 'Memberships',
  description: 'Who is a member, visitor, or leader — and how they moved.',
};

export default function MembershipsPage(): React.ReactElement {
  return <MembershipsClient />;
}
