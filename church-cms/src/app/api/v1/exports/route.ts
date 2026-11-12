import { withApiHandler, parseJsonBody, REQUEST_ID_HEADER } from '@/platform/http';
import { createExport, createExportBodySchema } from '@/modules/exports';

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createExportBodySchema);
  const result = await createExport(ctx, body);
  return new Response(result.body, {
    status: 200,
    headers: {
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'X-Export-Row-Count': String(result.rowCount),
      [REQUEST_ID_HEADER]: ctx.requestId,
    },
  });
});
