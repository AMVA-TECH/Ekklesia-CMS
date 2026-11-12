import type { Metadata } from 'next';
import { SettingsClient } from './settings-client';

export const metadata: Metadata = {
  title: 'Church profile',
  description: 'Organisation settings for this church.',
};

export default function ChurchSettingsPage(): React.ReactElement {
  return <SettingsClient />;
}
