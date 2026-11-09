import type { ZodType } from 'zod';

import { validationFailed } from '@/platform/errors';

/** Parse JSON body with a strict Zod schema; unknown keys rejected by schema. */
export async function parseJsonBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw validationFailed([{ field: 'body', code: 'invalid_json' }], 'Request body must be JSON.');
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    throw validationFailed(
      result.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        code: issue.code,
        message: issue.message,
      })),
    );
  }
  return result.data;
}

export function parseQuery<T>(url: URL, schema: ZodType<T>): T {
  const params = Object.fromEntries(url.searchParams.entries());
  const result = schema.safeParse(params);
  if (!result.success) {
    throw validationFailed(
      result.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'query',
        code: issue.code,
        message: issue.message,
      })),
    );
  }
  return result.data;
}
