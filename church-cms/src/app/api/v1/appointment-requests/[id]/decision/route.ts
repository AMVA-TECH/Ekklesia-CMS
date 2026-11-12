import { withApiHandler, parseJsonBody, jsonOk } from '@/platform/http';
import {
  decideAppointmentRequestBodySchema,
  decideAppointmentRequest,
} from '@/modules/governance';

export const POST = withApiHandler(async (ctx, request, routeCtx) => {
  const id = (await routeCtx!.params).id;
  const body = await parseJsonBody(request, decideAppointmentRequestBodySchema);
  const row = await decideAppointmentRequest(ctx, id, body);
  return jsonOk(row, ctx.requestId);
});
