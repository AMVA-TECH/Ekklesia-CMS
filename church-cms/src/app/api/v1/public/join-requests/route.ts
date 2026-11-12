import {
  withPublicApiHandler,
  parseJsonBody,
  jsonCreated,
} from '@/platform/http';
import {
  createJoinRequestBodySchema,
  createPublicJoinRequest,
} from '@/modules/membership';

export const POST = withPublicApiHandler(async (request, _routeCtx, requestId) => {
  const body = await parseJsonBody(request, createJoinRequestBodySchema);
  const result = await createPublicJoinRequest(body);
  return jsonCreated(
    result,
    requestId ?? '',
    `/api/v1/public/join-requests/${result.id}`,
  );
});
