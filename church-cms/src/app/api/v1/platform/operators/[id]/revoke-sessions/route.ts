import {
  withPlatformApiHandler,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import { revokeOperatorSessions } from '@/modules/platform-ops';
import { notFound } from '@/platform/errors';

export const POST = withPlatformApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx?.params)?.id;
  if (!id) throw notFound();
  const result = await revokeOperatorSessions(ctx, id);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
