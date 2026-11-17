import type { Metadata } from 'next';
import { AppointmentRequestsClient } from './requests-client';

export const metadata: Metadata = {
  title: 'Appointment requests',
  description: 'Proposed leadership appointments awaiting a decision.',
};

export default function AppointmentRequestsPage(): React.ReactElement {
  return <AppointmentRequestsClient />;
}
