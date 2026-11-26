'use client';

import { use } from 'react';
import { GuidedVerifyClient } from './guided-verify-client';

export default function GuidedApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <GuidedVerifyClient applicationId={id} />;
}
