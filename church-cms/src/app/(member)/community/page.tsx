import type { Metadata } from 'next';
import { CommunityClient } from './community-client';

export const instant = false;

export const metadata: Metadata = {
  title: 'Community',
  description: 'Ministries, groups, and your church family.',
};

/**
 * Community home.
 *
 * Combines three things members think of together: their ministry memberships
 * (participation), the church directory of other members who opted-in, and the
 * path to join a new ministry. No admin-only data appears here.
 */
export default function CommunityPage(): React.ReactElement {
  return <CommunityClient />;
}
