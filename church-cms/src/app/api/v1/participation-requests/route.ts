import {
  withApiHandler,
  parseJsonBody,
  parseQuery,
  jsonCreated,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  createParticipationRequestBodySchema,
  createParticipationRequest,
  listParticipationRequestsQuerySchema,
  listParticipationRequests,
} from '@/modules/ministries';

/** Approver queue: requests in units the caller can decide. */
export const GET = withApiHandler(async (ctx, request) => {
  const query = parseQuery(new URL(request.url), listParticipationRequestsQuerySchema);
  const result = await listParticipationRequests(ctx, query);
  return Response.json(result, { headers: { [REQUEST_ID_HEADER]: ctx.requestId } });
});

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createParticipationRequestBodySchema);
  const row = await createParticipationRequest(ctx, body);
  return jsonCreated(row, ctx.requestId, `/api/v1/participation-requests/${row.id}`);
});
