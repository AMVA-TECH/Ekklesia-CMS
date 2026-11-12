import { withApiHandler, parseJsonBody, jsonCreated } from '@/platform/http';
import {
  createProjectContributionBodySchema,
  recordProjectContribution,
} from '@/modules/finance';

export const POST = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, createProjectContributionBodySchema);
  const contribution = await recordProjectContribution(ctx, id, body);
  return jsonCreated(
    contribution,
    ctx.requestId,
    `/api/v1/projects/${id}/contributions`,
  );
});
