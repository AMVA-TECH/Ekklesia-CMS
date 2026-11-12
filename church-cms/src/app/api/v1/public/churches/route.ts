import {
  withPublicApiHandler,
  parseQuery,
  jsonOk,
} from '@/platform/http';
import {
  publicChurchSearchQuerySchema,
  searchPublicChurches,
} from '@/modules/membership';

export const GET = withPublicApiHandler(async (request, _routeCtx, requestId) => {
  const query = parseQuery(new URL(request.url), publicChurchSearchQuerySchema);
  return jsonOk(await searchPublicChurches(query), requestId ?? '');
});
