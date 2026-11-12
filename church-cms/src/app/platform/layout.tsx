import type { ReactNode } from 'react';
import { PlatformShell } from './platform-shell';
import './platform.css';

export const metadata = {
  title: 'Platform Operator · Church CMS',
  description: 'Platform oversight, security, audit, and growth console',
};

export default function PlatformLayout({ children }: { children: ReactNode }) {
  return <PlatformShell>{children}</PlatformShell>;
}
