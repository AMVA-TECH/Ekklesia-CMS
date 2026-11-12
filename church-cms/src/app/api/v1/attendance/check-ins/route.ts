import {
  withPublicApiHandler,
  parseJsonBody,
  jsonCreated,
} from '@/platform/http';
import type { Ctx } from '@/platform/auth';
import { getDb } from '@/platform/db/client';
import { notFound } from '@/platform/errors';
import { checkInWithQrPublic, qrCheckInBodySchema } from '@/modules/events';
import { findValidQrToken } from '@/modules/events/repository';

/** Public QR check-in — church inferred from token hash. */
export const POST = withPublicApiHandler(async (request, _routeCtx, requestId) => {
  const body = await parseJsonBody(request, qrCheckInBodySchema);
  const tokenRow = await findValidQrToken(getDb(), body.token);
  if (!tokenRow) throw notFound();

  const ctx: Ctx = {
    requestId: requestId ?? 'req_public',
    churchId: tokenRow.churchId,
    actor: { userAccountId: '00000000-0000-4000-8000-000000000001' },
    locale: 'en',
    permissions: new Set(),
  };

  const result = await checkInWithQrPublic(ctx, body);
  return jsonCreated(result, ctx.requestId, '/api/v1/attendance/check-ins');
});
