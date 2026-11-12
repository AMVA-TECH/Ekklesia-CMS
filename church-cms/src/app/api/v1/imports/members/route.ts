import { withApiHandler, parseJsonBody, jsonCreated } from '@/platform/http';
import { createMembersImportBodySchema, createMembersImport } from '@/modules/imports';

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createMembersImportBodySchema);
  const job = await createMembersImport(ctx, body);
  return jsonCreated(job, ctx.requestId, `/api/v1/imports/${job.id}`);
});
