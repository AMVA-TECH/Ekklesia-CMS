import type { Metadata } from 'next';
import { OfferingsClient } from './offerings-client';

export const metadata: Metadata = {
  title: 'Offerings',
  description: 'Sunday collections and other giving events.',
};

export default function OfferingsPage(): React.ReactElement {
  return <OfferingsClient />;
}
