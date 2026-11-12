import { withApiHandler, parseJsonBody, jsonOk } from '@/platform/http';
import { commitImportBodySchema, commitImport } from '@/modules/imports';

export const POST = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, commitImportBodySchema);
  return jsonOk(await commitImport(ctx, id, body), ctx.requestId);
});
