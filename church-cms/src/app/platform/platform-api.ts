'use client';

/** Dev platform-operator headers (ALLOW_DEV_AUTH=1). */
export const PLATFORM_DEV_HEADERS: Record<string, string> = {
  'x-dev-user-id': 'cccccccc-0001-0001-0001-000000000004',
  'x-dev-platform-operator': '1',
  'x-dev-platform-permissions':
    'platform:read,platform:admin,platform:impersonate_tenant,platform:security_read',
};

export type PlatformFieldError = {
  field: string;
  code?: string;
  message?: string;
};

export class PlatformApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly detail?: string;
  readonly errors: PlatformFieldError[];

  constructor(input: {
    message: string;
    status: number;
    code?: string;
    detail?: string;
    errors?: PlatformFieldError[];
  }) {
    super(input.message);
    this.name = 'PlatformApiError';
    this.status = input.status;
    this.code = input.code;
    this.detail = input.detail;
    this.errors = input.errors ?? [];
  }
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Church name',
  slug: 'Slug',
  timezone: 'Timezone',
  defaultLocale: 'Language',
  'admin.displayName': 'Admin name',
  'admin.email': 'Admin email',
  'admin.phoneE164': 'Admin phone',
  'admin.pin': 'Admin PIN',
  reason: 'Reason',
  churchId: 'Church',
  body: 'Form',
};

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Some information looks incorrect. Check the highlighted fields.',
  401: 'You are not signed in as a platform operator.',
  403: 'You do not have permission to do that.',
  404: 'We could not find that church.',
  409: 'This conflicts with something already saved.',
  422: 'Please fix the highlighted fields and try again.',
  429: 'Too many attempts. Wait a moment and try again.',
  500: 'Something went wrong on the server. Try again in a moment.',
  502: 'The server is temporarily unavailable. Try again shortly.',
  503: 'The service is temporarily unavailable. Try again shortly.',
};

function looksTechnical(message: string): boolean {
  return (
    /validation_failed|internal_error|problem\+json|zod|expected string|invalid_type|too_small|too_big|invalid_string|Required|Unauthorized|Forbidden|Conflict/i.test(
      message,
    ) || message.trim().startsWith('{')
  );
}

/** Rewrite Zod / RFC9457 wording into plain language for operators. */
export function humanizePlatformMessage(
  raw: string | undefined,
  opts?: { status?: number; code?: string; field?: string },
): string {
  const text = (raw ?? '').trim();
  const fieldLabel = opts?.field
    ? FIELD_LABELS[opts.field] ?? opts.field.replaceAll('.', ' ')
    : null;

  if (!text || looksTechnical(text)) {
    if (opts?.code === 'validation_failed') {
      return fieldLabel
        ? `${fieldLabel} needs a valid value.`
        : (STATUS_MESSAGES[422] ?? 'Please fix the form and try again.');
    }
    if (opts?.code === 'conflict') {
      return 'This conflicts with an existing church or account.';
    }
    if (opts?.code === 'not_found') {
      return 'We could not find that church.';
    }
    if (opts?.status && STATUS_MESSAGES[opts.status]) {
      return STATUS_MESSAGES[opts.status]!;
    }
    return 'Something went wrong. Please try again.';
  }

  // Known backend conflict / service strings → keep, lightly polish.
  const known: Record<string, string> = {
    'A church with this slug already exists.':
      'That slug is already used by another church. Choose a different one or leave it blank.',
    'An account with this admin email already exists.':
      'That admin email already has an account. Use a different email.',
    'An account with this admin phone already exists.':
      'That admin phone already has an account. Use a different number.',
    'Unable to enter tenant session':
      'Could not open that church for support. Check your access and try again.',
    'Resource not found.': 'We could not find that church.',
    'One or more fields are invalid.':
      'Please fix the highlighted fields and try again.',
    'Request body must be JSON.':
      'The form could not be sent. Refresh the page and try again.',
  };
  if (known[text]) return known[text];

  // Soften common Zod leftovers that still slipped through.
  if (/invalid email/i.test(text)) {
    return fieldLabel
      ? `Enter a valid ${fieldLabel.toLowerCase()}.`
      : 'Enter a valid email address.';
  }
  if (/too small|at least/i.test(text) && fieldLabel) {
    return `${fieldLabel} is too short.`;
  }
  if (/kebab|slug/i.test(text) && (opts?.field === 'slug' || /slug/i.test(text))) {
    return 'Use a simple slug like “hope-church” (lowercase letters, numbers, hyphens).';
  }
  if (/e\.164|phone must be/i.test(text) || opts?.field?.includes('phone')) {
    return 'Enter a Tanzania mobile number, e.g. 0712 345 678.';
  }

  return text;
}

function mapFieldErrors(
  errors: PlatformFieldError[],
  status?: number,
  code?: string,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const err of errors) {
    if (!err.field) continue;
    out[err.field] = humanizePlatformMessage(err.message || err.code, {
      status,
      code,
      field: err.field,
    });
  }
  return out;
}

/** Flatten nested Zod-style paths like `admin.email` for form keys. */
export function platformFieldErrorsFromApi(
  err: unknown,
): Record<string, string> {
  if (!(err instanceof PlatformApiError) || err.errors.length === 0) {
    return {};
  }
  return mapFieldErrors(err.errors, err.status, err.code);
}

/** Single user-facing summary for dialogs / banners. */
export function humanizePlatformError(err: unknown): string {
  if (err instanceof PlatformApiError) {
    if (err.errors.length > 0) {
      const first = err.errors[0]!;
      const mapped = humanizePlatformMessage(first.message || first.code, {
        status: err.status,
        code: err.code,
        field: first.field,
      });
      if (err.errors.length === 1) return mapped;
      return `${mapped} (${err.errors.length - 1} more issue${err.errors.length > 2 ? 's' : ''}).`;
    }
    return humanizePlatformMessage(err.message || err.detail, {
      status: err.status,
      code: err.code,
    });
  }
  if (err instanceof Error) {
    return humanizePlatformMessage(err.message);
  }
  return 'Something went wrong. Please try again.';
}

export async function platformApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: {
        ...PLATFORM_DEV_HEADERS,
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new PlatformApiError({
      message:
        'Could not reach the server. Check your connection and try again.',
      status: 0,
    });
  }

  if (!res.ok) {
    let detail = res.statusText || 'Request failed';
    let code: string | undefined;
    let errors: PlatformFieldError[] = [];
    try {
      const body = (await res.json()) as {
        detail?: string;
        title?: string;
        code?: string;
        errors?: PlatformFieldError[];
        message?: string;
      };
      detail = body.detail || body.title || body.message || detail;
      code = body.code;
      if (Array.isArray(body.errors)) errors = body.errors;
    } catch {
      // non-JSON body
    }
    throw new PlatformApiError({
      message: humanizePlatformMessage(detail, {
        status: res.status,
        code,
      }),
      status: res.status,
      code,
      detail,
      errors,
    });
  }

  if (res.status === 204) return undefined as T;
  const parsed = (await res.json()) as unknown;
  if (
    parsed !== null &&
    typeof parsed === 'object' &&
    'data' in parsed &&
    !('items' in parsed)
  ) {
    return (parsed as { data: T }).data;
  }
  return parsed as T;
}
