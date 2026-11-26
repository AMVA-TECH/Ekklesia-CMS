import { OperatorDetailClient } from './operator-detail-client';

export default async function OperatorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OperatorDetailClient operatorId={id} />;
}
