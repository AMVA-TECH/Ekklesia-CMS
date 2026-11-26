import {
  withPlatformApiHandler,
  parseJsonBody,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  getOperator,
  patchOperator,
  patchOperatorBodySchema,
} from '@/modules/platform-ops';
import { notFound } from '@/platform/errors';

export const GET = withPlatformApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx?.params)?.id;
  if (!id) throw notFound();
  const result = await getOperator(ctx, id);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});

export const PATCH = withPlatformApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx?.params)?.id;
  if (!id) throw notFound();
  const body = await parseJsonBody(request, patchOperatorBodySchema);
  const result = await patchOperator(ctx, id, body);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
