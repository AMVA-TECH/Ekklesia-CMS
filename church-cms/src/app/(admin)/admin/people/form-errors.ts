import type { ApiError } from '@/app/_ekklesia/session';

/**
 * Parse an `ApiError` body produced by `validationFailed` into form fields.
 * Backend shape: `{ error, details: [{ field, code, message }, …] }`.
 */
export function extractValidationErrors(err: ApiError): {
  fieldErrors?: Record<string, string>;
  formError?: string;
} {
  const body = err.body as
    | {
        details?: Array<{ field: string; code: string; message: string }>;
        error?: string;
      }
    | null;
  if (!body || !Array.isArray(body.details) || body.details.length === 0) {
    return { formError: body?.error ?? err.message };
  }
  const fieldErrors: Record<string, string> = {};
  for (const detail of body.details) {
    if (typeof detail.field === 'string' && typeof detail.message === 'string') {
      fieldErrors[detail.field] = detail.message;
    }
  }
  return { fieldErrors, formError: body.error ?? undefined };
}
