import { withApiHandler, parseJsonBody, jsonCreated, REQUEST_ID_HEADER } from '@/platform/http';
import { createPledgeBodySchema, createPledge, listPledges } from '@/modules/finance';

export const GET = withApiHandler(async (ctx) => {
  const result = await listPledges(ctx);
  return Response.json(result, { headers: { [REQUEST_ID_HEADER]: ctx.requestId } });
});

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createPledgeBodySchema);
  const pledge = await createPledge(ctx, body);
  return jsonCreated(pledge, ctx.requestId, `/api/v1/pledges/${pledge.id}`);
});
