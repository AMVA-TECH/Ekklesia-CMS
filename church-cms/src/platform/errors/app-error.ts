/** Stable machine-readable error codes (clients translate via i18n). */
export type ErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation_failed'
  | 'conflict'
  | 'rate_limited'
  | 'internal_error';

export interface FieldError {
  field: string;
  code: string;
  message?: string;
}

interface AppErrorOptions {
  code: ErrorCode;
  status: number;
  title: string;
  detail?: string;
  errors?: FieldError[];
  cause?: unknown;
}

/**
 * Domain/HTTP error. Never put stack traces or SQL in client-facing fields.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly title: string;
  readonly detail: string;
  readonly errors: FieldError[];

  constructor(options: AppErrorOptions) {
    super(options.detail ?? options.title, { cause: options.cause });
    this.name = 'AppError';
    this.code = options.code;
    this.status = options.status;
    this.title = options.title;
    this.detail = options.detail ?? options.title;
    this.errors = options.errors ?? [];
  }
}

export function unauthorized(detail = 'Authentication required.'): AppError {
  return new AppError({
    code: 'unauthorized',
    status: 401,
    title: 'Unauthorized',
    detail,
  });
}

export function forbidden(detail = 'You are not allowed to perform this action.'): AppError {
  return new AppError({
    code: 'forbidden',
    status: 403,
    title: 'Forbidden',
    detail,
  });
}

/** Use for missing records and cross-tenant hits (never reveal other church). */
export function notFound(detail = 'Resource not found.'): AppError {
  return new AppError({
    code: 'not_found',
    status: 404,
    title: 'Not found',
    detail,
  });
}

export function conflict(detail: string): AppError {
  return new AppError({
    code: 'conflict',
    status: 409,
    title: 'Conflict',
    detail,
  });
}

export function validationFailed(errors: FieldError[], detail?: string): AppError {
  return new AppError({
    code: 'validation_failed',
    status: 422,
    title: 'Validation failed',
    detail: detail ?? 'One or more fields are invalid.',
    errors,
  });
}

export function internalError(cause?: unknown): AppError {
  return new AppError({
    code: 'internal_error',
    status: 500,
    title: 'Internal error',
    detail: 'An unexpected error occurred.',
    cause,
  });
}
