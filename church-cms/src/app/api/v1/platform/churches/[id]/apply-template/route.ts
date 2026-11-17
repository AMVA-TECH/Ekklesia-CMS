import { z } from 'zod';

import {
  withPlatformApiHandler,
  parseJsonBody,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import { applyChurchTemplate } from '@/modules/platform-ops/apply-template';

const bodySchema = z
  .object({
    templateId: z.string().trim().min(1).max(80),
    force: z.boolean().optional(),
  })
  .strict();

export const POST = withPlatformApiHandler(async (ctx, request, routeCtx) => {
  const params = routeCtx ? await routeCtx.params : {};
  const id = params.id;
  if (!id) {
    return Response.json({ error: 'missing id' }, { status: 400 });
  }
  const body = await parseJsonBody(request, bodySchema);
  const result = await applyChurchTemplate(ctx, id, body);
  return Response.json(result, {
    status: 200,
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
