import { withApiHandler, parseQuery, jsonOk } from '@/platform/http';
import {
  listJoinRequests,
  listJoinRequestsQuerySchema,
} from '@/modules/membership';

export const GET = withApiHandler(async (ctx, request) => {
  const query = parseQuery(new URL(request.url), listJoinRequestsQuerySchema);
  return jsonOk(await listJoinRequests(ctx, query), ctx.requestId);
});
