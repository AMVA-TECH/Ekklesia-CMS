import { z } from 'zod';

import { validationFailed } from '@/platform/errors';

type ParsableSchema<T> = {
  safeParse: (
    data: unknown,
  ) => { success: true; data: T } | { success: false; error: z.ZodError };
};

/** Parse JSON body with a strict Zod schema; unknown keys rejected by schema. */
export async function parseJsonBody<T>(
  request: Request,
  schema: ParsableSchema<T>,
): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw validationFailed([{ field: 'body', code: 'invalid_json' }], 'Request body must be JSON.');
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    throw validationFailed(
      result.error.issues.map((issue: z.core.$ZodIssue) => ({
        field: issue.path.join('.') || 'body',
        code: String(issue.code),
        message: issue.message,
      })),
    );
  }
  return result.data;
}

export function parseQuery<T>(url: URL, schema: ParsableSchema<T>): T {
  const params = Object.fromEntries(url.searchParams.entries());
  const result = schema.safeParse(params);
  if (!result.success) {
    throw validationFailed(
      result.error.issues.map((issue: z.core.$ZodIssue) => ({
        field: issue.path.join('.') || 'query',
        code: String(issue.code),
        message: issue.message,
      })),
    );
  }
  return result.data;
}
