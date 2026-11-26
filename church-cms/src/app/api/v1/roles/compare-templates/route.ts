import {
  withApiHandler,
  parseJsonBody,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  compareRoleTemplates,
  compareRoleTemplatesBodySchema,
} from '@/modules/access-control';

/**
 * Dry-run rematrix: compare church roles to platform templates.
 * Does not mutate — use POST /api/v1/roles/apply-templates with confirm:true.
 */
export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, compareRoleTemplatesBodySchema);
  const result = await compareRoleTemplates(ctx, body);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
