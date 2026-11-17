import type { Metadata } from 'next';
import { OrganisationClient } from './organisation-client';

export const metadata: Metadata = {
  title: 'Organisation',
  description: 'Organisational structure and unit hierarchy for your church.',
};

export default function OrganisationPage(): React.ReactElement {
  return <OrganisationClient />;
}
