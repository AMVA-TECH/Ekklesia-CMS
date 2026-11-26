import {
  withPublicApiHandler,
  parseJsonBody,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  verifyRegistrationEmailBodySchema,
  verifyRegistrationEmail,
} from '@/modules/platform-ops';

export const POST = withPublicApiHandler(async (request, _routeCtx, requestId) => {
  const body = await parseJsonBody(request, verifyRegistrationEmailBodySchema);
  const result = await verifyRegistrationEmail(body);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: requestId ?? '' },
  });
});
