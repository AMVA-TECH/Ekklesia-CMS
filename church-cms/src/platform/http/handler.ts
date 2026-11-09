import type { Ctx } from '@/platform/auth';
import { requireCtx, readDevSession } from '@/platform/auth';
import { resolveRequestId, REQUEST_ID_HEADER } from './request-id';
import { toProblemResponse } from './problem';

export interface RouteContext {
  params: Promise<Record<string, string>>;
}

type Handler = (
  ctx: Ctx,
  request: Request,
  routeCtx?: RouteContext,
) => Promise<Response> | Response;

/** Thin API wrapper: request id, session→Ctx, problem mapping. */
export function withApiHandler(handler: Handler) {
  return async (request: Request, routeCtx?: RouteContext): Promise<Response> => {
    const requestId = resolveRequestId(request);
    try {
      const ctx = requireCtx({
        requestId,
        session: readDevSession(request),
        acceptLanguage: request.headers.get('accept-language'),
      });
      const response = await handler(ctx, request, routeCtx);
      response.headers.set(REQUEST_ID_HEADER, requestId);
      return response;
    } catch (error) {
      return toProblemResponse(error, requestId);
    }
  };
}
