import {
  withPublicApiHandler,
  parseQuery,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  publicRegistrationStatusQuerySchema,
  getPublicRegistrationStatus,
} from '@/modules/platform-ops';

export const GET = withPublicApiHandler(async (request, routeCtx, requestId) => {
  const params = await routeCtx?.params;
  const id = params?.id;
  if (!id) {
    return Response.json(
      { title: 'Not found', detail: 'Missing application id.' },
      { status: 404, headers: { [REQUEST_ID_HEADER]: requestId ?? '' } },
    );
  }
  const query = parseQuery(new URL(request.url), publicRegistrationStatusQuerySchema);
  const result = await getPublicRegistrationStatus(id, query.accessToken);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: requestId ?? '' },
  });
});
