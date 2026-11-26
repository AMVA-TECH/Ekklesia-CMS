import {
  withPlatformApiHandler,
  parseQuery,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  listTenantAccountsQuerySchema,
  listTenantTechnicalAccounts,
} from '@/modules/platform-ops';
import { notFound } from '@/platform/errors';

export const GET = withPlatformApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx?.params)?.id;
  if (!id) throw notFound();
  const query = parseQuery(new URL(request.url), listTenantAccountsQuerySchema);
  const result = await listTenantTechnicalAccounts(ctx, id, query);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
