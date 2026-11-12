import type { Ctx, PlatformCtx } from '@/platform/auth';
import {
  requireCtx,
  requirePlatformCtx,
  resolveSessionClaims,
} from '@/platform/auth';
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

type PlatformHandler = (
  ctx: PlatformCtx,
  request: Request,
  routeCtx?: RouteContext,
) => Promise<Response> | Response;

type PublicHandler = (
  request: Request,
  routeCtx?: RouteContext,
  requestId?: string,
) => Promise<Response> | Response;

/** Thin API wrapper: request id, session→Ctx, problem mapping. */
export function withApiHandler(handler: Handler) {
  return async (request: Request, routeCtx?: RouteContext): Promise<Response> => {
    const requestId = resolveRequestId(request);
    try {
      const session = await resolveSessionClaims(request);
      const ctx = requireCtx({
        requestId,
        session,
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

/** Platform operator API wrapper (ADR-0003). */
export function withPlatformApiHandler(handler: PlatformHandler) {
  return async (request: Request, routeCtx?: RouteContext): Promise<Response> => {
    const requestId = resolveRequestId(request);
    try {
      const session = await resolveSessionClaims(request);
      const ctx = requirePlatformCtx({
        requestId,
        session,
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

/** Unauthenticated handler (e.g. public QR check-in). Caller builds its own Ctx. */
export function withPublicApiHandler(handler: PublicHandler) {
  return async (request: Request, routeCtx?: RouteContext): Promise<Response> => {
    const requestId = resolveRequestId(request);
    try {
      const response = await handler(request, routeCtx, requestId);
      response.headers.set(REQUEST_ID_HEADER, requestId);
      return response;
    } catch (error) {
      return toProblemResponse(error, requestId);
    }
  };
}
