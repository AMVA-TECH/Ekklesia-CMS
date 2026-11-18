import type { ReactNode } from 'react';
import { AuthFrame } from './auth-frame';
import './auth-panel.css';

/** Auth shell; the markup lives in a client frame so it follows the UI language. */
export default function AuthLayout({ children }: { children: ReactNode }): React.ReactElement {
  return <AuthFrame>{children}</AuthFrame>;
}
