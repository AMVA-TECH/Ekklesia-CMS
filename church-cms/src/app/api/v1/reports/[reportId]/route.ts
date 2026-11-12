import { withApiHandler, parseQuery, jsonOk } from '@/platform/http';
import {
  reportQuerySchema,
  reportIdSchema,
  getLeadershipReport,
} from '@/modules/governance';
import { validationFailed } from '@/platform/errors';

export const GET = withApiHandler(async (ctx, request, routeCtx) => {
  const reportId = (await routeCtx!.params).reportId;
  const parsedId = reportIdSchema.safeParse(reportId);
  if (!parsedId.success) {
    throw validationFailed([
      {
        field: 'reportId',
        code: 'unsupported',
        message: 'Unknown or unimplemented report id',
      },
    ]);
  }
  const url = new URL(request.url);
  const query = parseQuery(url, reportQuerySchema);
  const report = await getLeadershipReport(ctx, parsedId.data, query);
  return jsonOk(report, ctx.requestId);
});
