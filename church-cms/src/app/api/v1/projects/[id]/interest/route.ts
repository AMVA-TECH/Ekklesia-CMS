import { withApiHandler, parseJsonBody, jsonCreated } from '@/platform/http';
import {
  expressProjectInterestBodySchema,
  expressProjectInterest,
} from '@/modules/finance';

export const POST = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, expressProjectInterestBodySchema);
  const interest = await expressProjectInterest(ctx, id, body);
  return jsonCreated(
    interest,
    ctx.requestId,
    `/api/v1/projects/${id}/interest-requests/${interest.id}`,
  );
});
