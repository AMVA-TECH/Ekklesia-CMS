import {
  withApiHandler,
  parseJsonBody,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  deactivateRole,
  getRole,
  updateRole,
  updateRoleBodySchema,
} from '@/modules/access-control';

export const GET = withApiHandler(async (ctx, _request, routeCtx) => {
  const params = await routeCtx!.params;
  const role = await getRole(ctx, params.id);
  return Response.json(
    { data: role },
    { headers: { [REQUEST_ID_HEADER]: ctx.requestId } },
  );
});

export const PATCH = withApiHandler(async (ctx, request, routeCtx) => {
  const params = await routeCtx!.params;
  const body = await parseJsonBody(request, updateRoleBodySchema);
  const role = await updateRole(ctx, params.id, body);
  return Response.json(
    { data: role },
    { headers: { [REQUEST_ID_HEADER]: ctx.requestId } },
  );
});

export const DELETE = withApiHandler(async (ctx, _request, routeCtx) => {
  const params = await routeCtx!.params;
  const result = await deactivateRole(ctx, params.id);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
