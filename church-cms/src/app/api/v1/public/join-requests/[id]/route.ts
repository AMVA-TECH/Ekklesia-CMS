import {
  withPublicApiHandler,
  parseQuery,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  publicJoinRequestStatusQuerySchema,
  getPublicJoinRequestStatus,
} from '@/modules/membership';

export const GET = withPublicApiHandler(async (request, routeCtx, requestId) => {
  const params = await routeCtx?.params;
  const id = params?.id;
  if (!id) {
    return Response.json(
      { title: 'Not found', detail: 'Missing join request id.' },
      { status: 404, headers: { [REQUEST_ID_HEADER]: requestId ?? '' } },
    );
  }
  const query = parseQuery(
    new URL(request.url),
    publicJoinRequestStatusQuerySchema,
  );
  const result = await getPublicJoinRequestStatus(id, query.accessToken);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: requestId ?? '' },
  });
});
