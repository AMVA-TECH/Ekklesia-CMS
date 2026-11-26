import {
  withPlatformApiHandler,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import { getChurchApplication } from '@/modules/platform-ops';
import { notFound } from '@/platform/errors';

export const GET = withPlatformApiHandler(async (ctx, _request, routeCtx) => {
  const params = await routeCtx?.params;
  const id = params?.id;
  if (!id) throw notFound();
  const result = await getChurchApplication(ctx, id);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
