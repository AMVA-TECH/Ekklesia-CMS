import { withApiHandler, parseJsonBody, parseQuery, jsonCreated, REQUEST_ID_HEADER } from '@/platform/http';
import { createOfferingBodySchema, listOfferingsQuerySchema, createOffering, listOfferings } from '@/modules/finance';

export const GET = withApiHandler(async (ctx, request) => {
  const query = parseQuery(new URL(request.url), listOfferingsQuerySchema);
  const result = await listOfferings(ctx, query);
  return Response.json(result, { headers: { [REQUEST_ID_HEADER]: ctx.requestId } });
});

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createOfferingBodySchema);
  const offering = await createOffering(ctx, body);
  return jsonCreated(offering, ctx.requestId, `/api/v1/offerings/${offering.id}`);
});
