import {
  withPlatformApiHandler,
  parseQuery,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  listSecurityFindings,
  listFindingsQuerySchema,
  runDetectors,
} from '@/modules/platform-ops';

export const GET = withPlatformApiHandler(async (ctx, request) => {
  const query = parseQuery(new URL(request.url), listFindingsQuerySchema);
  const result = await listSecurityFindings(ctx, query);
  return Response.json(result, { headers: { [REQUEST_ID_HEADER]: ctx.requestId } });
});

/** Run rule-based detectors and upsert findings. */
export const POST = withPlatformApiHandler(async (ctx) => {
  const result = await runDetectors(ctx);
  return Response.json(result, { headers: { [REQUEST_ID_HEADER]: ctx.requestId } });
});
