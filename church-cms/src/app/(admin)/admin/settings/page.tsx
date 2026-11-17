import type { Metadata } from 'next';
import { ChurchProfileForm } from './church-profile-form';
import { SettingsAccessClient } from './settings-access-client';

export const metadata: Metadata = {
  title: 'Church profile',
  description: 'Organisation profile, branding, and role access for this church.',
};

export default function ChurchSettingsPage(): React.ReactElement {
  return (
    <div className="flex flex-col gap-8">
      <ChurchProfileForm />
      <SettingsAccessClient />
    </div>
  );
}
