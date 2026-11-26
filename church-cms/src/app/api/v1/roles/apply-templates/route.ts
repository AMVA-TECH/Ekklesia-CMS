import {
  withApiHandler,
  parseJsonBody,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  applyRoleTemplates,
  applyRoleTemplatesBodySchema,
} from '@/modules/access-control';

/**
 * Explicit rematrix of church roles from platform templates.
 * Requires confirm:true — never silent.
 */
export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, applyRoleTemplatesBodySchema);
  const result = await applyRoleTemplates(ctx, body);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
