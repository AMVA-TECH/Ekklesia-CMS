import type { Metadata } from 'next';
import { HomeClient } from './home-client';

/** Auth-gated client home; skip instant-nav validation while session loads. */
export const instant = false;

export const metadata: Metadata = {
  title: 'Home',
  description: 'Your church home — what is happening this week.',
};

/**
 * Member home.
 *
 * The one screen most members will open each week. Structure (top → bottom on
 * phones) is deliberate:
 *   1. Personal, warm greeting
 *   2. Featured announcement or upcoming service (hero)
 *   3. Quick actions (one tap to common journeys)
 *   4. Daily devotional (the only Fraunces use on the page)
 *   5. Upcoming events (sky tone)
 *   6. Your ministries & groups (sage tone)
 *   7. Latest from the church (community updates)
 */
export default function MemberHomePage(): React.ReactElement {
  return <HomeClient />;
}
