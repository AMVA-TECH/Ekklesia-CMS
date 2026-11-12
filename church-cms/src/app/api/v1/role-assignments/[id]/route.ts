import { withApiHandler, jsonOk } from '@/platform/http';
import { revokeRoleAssignment } from '@/modules/access-control';

export const DELETE = withApiHandler(async (ctx, _request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  return jsonOk(await revokeRoleAssignment(ctx, id), ctx.requestId);
});
