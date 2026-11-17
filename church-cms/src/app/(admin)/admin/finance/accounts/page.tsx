import type { Metadata } from 'next';
import { AccountsClient } from './accounts-client';

export const metadata: Metadata = {
  title: 'Accounts & years',
  description: 'Chart of accounts and financial years.',
};

export default function AccountsPage(): React.ReactElement {
  return <AccountsClient />;
}
