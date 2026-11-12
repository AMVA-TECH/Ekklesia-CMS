import {
  withApiHandler,
  parseJsonBody,
  parseQuery,
  jsonCreated,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  createCorrectionRequestBodySchema,
  listCorrectionRequestsQuerySchema,
  createCorrectionRequest,
  listCorrectionRequests,
} from '@/modules/events';

export const GET = withApiHandler(async (ctx, request) => {
  const query = parseQuery(new URL(request.url), listCorrectionRequestsQuerySchema);
  const result = await listCorrectionRequests(ctx, query);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createCorrectionRequestBodySchema);
  const row = await createCorrectionRequest(ctx, body);
  return jsonCreated(
    row,
    ctx.requestId,
    `/api/v1/attendance/correction-requests/${row.id}`,
  );
});
