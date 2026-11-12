import {
  withPlatformApiHandler,
  parseJsonBody,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  patchSecurityFinding,
  patchFindingBodySchema,
} from '@/modules/platform-ops';

export const PATCH = withPlatformApiHandler(async (ctx, request, routeCtx) => {
  const params = routeCtx ? await routeCtx.params : {};
  const id = params.id;
  if (!id) {
    return Response.json({ error: 'missing id' }, { status: 400 });
  }
  const body = await parseJsonBody(request, patchFindingBodySchema);
  const result = await patchSecurityFinding(ctx, id, body);
  return Response.json(result, { headers: { [REQUEST_ID_HEADER]: ctx.requestId } });
});
