import { withApiHandler, parseJsonBody, jsonCreated, REQUEST_ID_HEADER } from '@/platform/http';
import { createFundBodySchema, createFund, listFunds } from '@/modules/finance';

export const GET = withApiHandler(async (ctx) => {
  const result = await listFunds(ctx);
  return Response.json(result, { headers: { [REQUEST_ID_HEADER]: ctx.requestId } });
});

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createFundBodySchema);
  const fund = await createFund(ctx, body);
  return jsonCreated(fund, ctx.requestId, `/api/v1/funds/${fund.id}`);
});
