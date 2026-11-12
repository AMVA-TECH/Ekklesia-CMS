import {
  withApiHandler,
  parseJsonBody,
  jsonCreated,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  createSavedReportBodySchema,
  createSavedReport,
  listSavedReports,
} from '@/modules/governance';

export const GET = withApiHandler(async (ctx) => {
  const result = await listSavedReports(ctx);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createSavedReportBodySchema);
  const row = await createSavedReport(ctx, body);
  return jsonCreated(row, ctx.requestId, `/api/v1/saved-reports/${row.id}`);
});
