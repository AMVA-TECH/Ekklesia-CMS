import { withApiHandler, parseQuery, REQUEST_ID_HEADER } from '@/platform/http';
import {
  listMyParticipationRequestsQuerySchema,
  listMyParticipationRequests,
} from '@/modules/ministries';

// Single `{ data: [...] }` envelope like other list routes. Wrapping the
// service result in jsonOk produced `{ data: { data } }`, which the member
// Community and Home pages received as an object instead of a list.
export const GET = withApiHandler(async (ctx, request) => {
  const url = new URL(request.url);
  const query = parseQuery(url, listMyParticipationRequestsQuerySchema);
  const result = await listMyParticipationRequests(ctx, query);
  return Response.json(result, { headers: { [REQUEST_ID_HEADER]: ctx.requestId } });
});
