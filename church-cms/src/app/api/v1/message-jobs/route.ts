import {
  withApiHandler,
  parseJsonBody,
  jsonCreated,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  createMessageJobBodySchema,
  createMessageJob,
  listMessageJobs,
} from '@/modules/messaging';

export const GET = withApiHandler(async (ctx) => {
  const result = await listMessageJobs(ctx);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createMessageJobBodySchema);
  const job = await createMessageJob(ctx, body);
  return jsonCreated(job, ctx.requestId, `/api/v1/message-jobs/${job.id}`);
});
