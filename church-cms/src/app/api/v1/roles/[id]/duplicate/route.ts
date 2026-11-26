import {
  withApiHandler,
  parseJsonBody,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  duplicateRole,
  duplicateRoleBodySchema,
} from '@/modules/access-control';

export const POST = withApiHandler(async (ctx, request, routeCtx) => {
  const params = await routeCtx!.params;
  const body = await parseJsonBody(request, duplicateRoleBodySchema);
  const role = await duplicateRole(ctx, params.id, body);
  return Response.json(
    { data: role },
    { status: 201, headers: { [REQUEST_ID_HEADER]: ctx.requestId } },
  );
});
