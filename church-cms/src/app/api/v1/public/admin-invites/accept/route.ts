import {
  withPublicApiHandler,
  parseJsonBody,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  acceptAdminInviteBodySchema,
  acceptAdminInvite,
} from '@/modules/platform-ops';

export const POST = withPublicApiHandler(async (request, _routeCtx, requestId) => {
  const body = await parseJsonBody(request, acceptAdminInviteBodySchema);
  const result = await acceptAdminInvite(body);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: requestId ?? '' },
  });
});
