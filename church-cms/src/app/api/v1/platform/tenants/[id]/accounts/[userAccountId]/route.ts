import {
  withPlatformApiHandler,
  parseJsonBody,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  patchTenantAccountBodySchema,
  patchTenantTechnicalAccount,
} from '@/modules/platform-ops';
import { notFound } from '@/platform/errors';

export const PATCH = withPlatformApiHandler(async (ctx, request, routeCtx) => {
  const params = await routeCtx?.params;
  const churchId = params?.id;
  const userAccountId = params?.userAccountId;
  if (!churchId || !userAccountId) throw notFound();
  const body = await parseJsonBody(request, patchTenantAccountBodySchema);
  const result = await patchTenantTechnicalAccount(
    ctx,
    churchId,
    userAccountId,
    body,
  );
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
