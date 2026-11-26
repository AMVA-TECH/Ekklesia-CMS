import {
  withApiHandler,
  parseJsonBody,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  updateRolePermissions,
  updateRolePermissionsBodySchema,
} from '@/modules/access-control';

export const PUT = withApiHandler(async (ctx, request, routeCtx) => {
  const params = await routeCtx!.params;
  const body = await parseJsonBody(request, updateRolePermissionsBodySchema);
  const role = await updateRolePermissions(ctx, params.id, body);
  return Response.json(
    { data: role },
    { headers: { [REQUEST_ID_HEADER]: ctx.requestId } },
  );
});
