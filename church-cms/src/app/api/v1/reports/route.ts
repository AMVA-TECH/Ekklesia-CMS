import { withApiHandler, REQUEST_ID_HEADER } from '@/platform/http';
import { listReportCatalogue } from '@/modules/governance';

export const GET = withApiHandler(async (ctx) => {
  const result = await listReportCatalogue(ctx);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
