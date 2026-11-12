import type { Metadata } from 'next';
import { HouseholdsClient } from './households-client';

export const metadata: Metadata = {
  title: 'Households',
  description: 'Families and shared contact groups across your church.',
};

export default function HouseholdsPage(): React.ReactElement {
  return <HouseholdsClient />;
}
