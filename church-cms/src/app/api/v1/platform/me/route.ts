import { withPlatformApiHandler, REQUEST_ID_HEADER } from '@/platform/http';
import { assertPlatformRead } from '@/modules/platform-ops';

export const GET = withPlatformApiHandler(async (ctx) => {
  assertPlatformRead(ctx);
  const permissions = [...ctx.platformPermissions].sort();
  return Response.json(
    {
      userAccountId: ctx.actor.userAccountId,
      permissions,
      isAdmin: ctx.platformPermissions.has('platform:admin'),
    },
    {
      headers: { [REQUEST_ID_HEADER]: ctx.requestId },
    },
  );
});
