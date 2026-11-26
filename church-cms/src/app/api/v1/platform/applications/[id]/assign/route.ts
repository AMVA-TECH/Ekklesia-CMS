import {
  withPlatformApiHandler,
  parseJsonBody,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  assignApplicationBodySchema,
  assignChurchApplication,
} from '@/modules/platform-ops';
import { notFound } from '@/platform/errors';

export const POST = withPlatformApiHandler(async (ctx, request, routeCtx) => {
  const params = await routeCtx?.params;
  const id = params?.id;
  if (!id) throw notFound();
  const body = await parseJsonBody(request, assignApplicationBodySchema);
  const result = await assignChurchApplication(ctx, id, body);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
