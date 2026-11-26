import {
  withPlatformApiHandler,
  parseJsonBody,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import { purgeAuditLogs, purgeAuditLogsBodySchema } from '@/modules/platform-ops';

export const POST = withPlatformApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, purgeAuditLogsBodySchema);
  const result = await purgeAuditLogs(ctx, body);
  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
