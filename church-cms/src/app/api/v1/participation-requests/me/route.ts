import { withApiHandler, parseQuery, jsonOk } from '@/platform/http';
import {
  listMyParticipationRequestsQuerySchema,
  listMyParticipationRequests,
} from '@/modules/ministries';

export const GET = withApiHandler(async (ctx, request) => {
  const url = new URL(request.url);
  const query = parseQuery(url, listMyParticipationRequestsQuerySchema);
  const result = await listMyParticipationRequests(ctx, query);
  return jsonOk(result, ctx.requestId);
});
