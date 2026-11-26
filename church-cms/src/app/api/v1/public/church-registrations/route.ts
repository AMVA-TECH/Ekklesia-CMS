import {
  withPublicApiHandler,
  parseJsonBody,
  jsonCreated,
} from '@/platform/http';
import {
  submitChurchRegistrationBodySchema,
  submitChurchRegistration,
} from '@/modules/platform-ops';

export const POST = withPublicApiHandler(async (request, _routeCtx, requestId) => {
  const body = await parseJsonBody(request, submitChurchRegistrationBodySchema);
  const forwarded = request.headers.get('x-forwarded-for');
  const clientKey =
    forwarded?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    undefined;
  const result = await submitChurchRegistration(body, { clientKey });
  return jsonCreated(
    result,
    requestId ?? '',
    `/api/v1/public/church-registrations/${result.id}`,
  );
});
