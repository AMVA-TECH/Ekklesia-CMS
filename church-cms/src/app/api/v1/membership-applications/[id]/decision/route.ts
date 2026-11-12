import { withApiHandler, parseJsonBody, jsonOk } from '@/platform/http';
import {
  decideMembershipApplicationBodySchema,
  decideMembershipApplication,
} from '@/modules/membership';

export const POST = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, decideMembershipApplicationBodySchema);
  return jsonOk(await decideMembershipApplication(ctx, id, body), ctx.requestId);
});
