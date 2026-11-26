import {
  withPlatformApiHandler,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import { revokeTenantAccountSessions } from '@/modules/platform-ops';
import { notFound } from '@/platform/errors';

export const POST = withPlatformApiHandler(async (ctx, _request, routeCtx) => {
  const params = await routeCtx?.params;
  const churchId = params?.id;
  const userAccountId = params?.userAccountId;
  if (!churchId || !userAccountId) throw notFound();
  const result = await revokeTenantAccountSessions(
    ctx,
    churchId,
    userAccountId,
  );
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
