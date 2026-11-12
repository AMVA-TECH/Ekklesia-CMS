import { withApiHandler, parseJsonBody, parseQuery, jsonCreated, REQUEST_ID_HEADER } from '@/platform/http';
import {
  createUnitBodySchema,
  listUnitsQuerySchema,
  createOrganisationalUnit,
  listOrganisationalUnits,
} from '@/modules/organisation';

export const GET = withApiHandler(async (ctx, request) => {
  const url = new URL(request.url);
  const query = parseQuery(url, listUnitsQuerySchema);
  const result = await listOrganisationalUnits(ctx, query);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createUnitBodySchema);
  const unit = await createOrganisationalUnit(ctx, body);
  return jsonCreated(unit, ctx.requestId, `/api/v1/organisational-units/${unit.id}`);
});
