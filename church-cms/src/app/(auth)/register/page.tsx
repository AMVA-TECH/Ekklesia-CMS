import type { Metadata } from 'next';
import { RegisterClient } from './register-client';

export const instant = false;

export const metadata: Metadata = {
  title: 'Request to join',
  description: 'Register and request to join your church on Ekklesia.',
};

export default function RegisterPage(): React.ReactElement {
  return <RegisterClient />;
}
