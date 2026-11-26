import type { ReactNode } from 'react';
import { PlatformShell } from './platform-shell';
/** Legacy page clients still use `.platform-*` until migrated to `_ekklesia/ui`. */
import './platform.css';

export const metadata = {
  title: 'Platform Admin · Ekklesia',
  description: 'Ekklesia platform control plane — governance, tenants, security, and operations',
};

export default function PlatformLayout({ children }: { children: ReactNode }) {
  return <PlatformShell>{children}</PlatformShell>;
}
