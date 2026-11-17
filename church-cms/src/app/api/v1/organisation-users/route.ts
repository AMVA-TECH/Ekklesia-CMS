import { withApiHandler, REQUEST_ID_HEADER } from '@/platform/http';
import { listOrganisationUsers } from '@/modules/access-control';

/** Active organisation users in the current church (role-assign picker). */
export const GET = withApiHandler(async (ctx) => {
  const result = await listOrganisationUsers(ctx);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
