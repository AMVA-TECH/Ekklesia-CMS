import { AppError, internalError } from '@/platform/errors';
import { REQUEST_ID_HEADER } from './request-id';

export interface ProblemBody {
  type: string;
  title: string;
  status: number;
  code: string;
  detail: string;
  requestId: string;
  errors?: Array<{ field: string; code: string; message?: string }>;
}

function problemType(code: string): string {
  return `https://church-cms.local/problems/${code.split('_').join('-')}`;
}


/** Map thrown errors to RFC 9457 problem+json. */
export function toProblemResponse(error: unknown, requestId: string): Response {
  const appError = error instanceof AppError ? error : internalError(error);

  const body: ProblemBody = {
    type: problemType(appError.code),
    title: appError.title,
    status: appError.status,
    code: appError.code,
    detail: appError.detail,
    requestId,
  };

  if (appError.errors.length > 0) {
    body.errors = appError.errors;
  }

  return Response.json(body, {
    status: appError.status,
    headers: {
      'Content-Type': 'application/problem+json',
      [REQUEST_ID_HEADER]: requestId,
    },
  });
}

export function jsonOk<T>(
  data: T,
  requestId: string,
  init?: { status?: number; headers?: HeadersInit },
): Response {
  return Response.json(
    { data },
    {
      status: init?.status ?? 200,
      headers: {
        [REQUEST_ID_HEADER]: requestId,
        ...init?.headers,
      },
    },
  );
}

export function jsonCreated<T>(data: T, requestId: string, location: string): Response {
  return jsonOk(data, requestId, {
    status: 201,
    headers: { Location: location },
  });
}
