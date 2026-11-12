import type { Metadata } from 'next';
import { GivingClient } from './giving-client';

export const instant = false;

export const metadata: Metadata = {
  title: 'Giving',
  description: 'Your pledges and giving history with this church.',
};

/**
 * Member giving overview.
 *
 * Only surfaces data the backend confirms (open pledges). We never fabricate
 * "paid" status or totals — if a payment stream is not connected yet, the
 * screen stays honest and shows an EmptyState with next steps.
 */
export default function GivingPage(): React.ReactElement {
  return <GivingClient />;
}
