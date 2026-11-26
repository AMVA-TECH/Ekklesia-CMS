import { ChurchDetailClient } from './church-detail-client';

export default async function ChurchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ChurchDetailClient churchId={id} />;
}
