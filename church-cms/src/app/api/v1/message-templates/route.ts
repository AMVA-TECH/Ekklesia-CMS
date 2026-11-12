import { withApiHandler, parseJsonBody, jsonCreated, REQUEST_ID_HEADER } from '@/platform/http';
import { createTemplateBodySchema, createMessageTemplate, listMessageTemplates } from '@/modules/messaging';

export const GET = withApiHandler(async (ctx) => {
  const result = await listMessageTemplates(ctx);
  return Response.json(result, { headers: { [REQUEST_ID_HEADER]: ctx.requestId } });
});

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createTemplateBodySchema);
  const template = await createMessageTemplate(ctx, body);
  return jsonCreated(template, ctx.requestId, `/api/v1/message-templates/${template.id}`);
});
