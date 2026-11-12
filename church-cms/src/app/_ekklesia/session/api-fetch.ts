/**
 * Central fetch helper for Ekklesia client components.
 *
 * Goals:
 *  - One place for request credentials, Accept header defaults, and JSON parsing.
 *  - One place for development-only `x-dev-*` identity headers, so no feature
 *    page hardcodes IDs. Dev headers are read from `localStorage` and are only
 *    attached when `NEXT_PUBLIC_ALLOW_DEV_AUTH === "1"`.
 *  - Consistent `ApiError` shape so UI can show real backend messages.
 *
 * Non-goals:
 *  - Mutating state or caching. Callers own their data layer (SWR, RQ, Suspense, …).
 *  - Hiding non-2xx responses. Errors reach the caller as `ApiError` instances.
 */

const DEV_HEADERS_STORAGE_KEY = 'ek-dev-headers';

/** Error thrown by `apiFetch` for any non-2xx response. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

/** Options accepted by `apiFetch`. */
export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  /** JSON body — stringified automatically and `Content-Type` applied. */
  json?: unknown;
  /** Raw body passthrough (overrides `json`). */
  body?: BodyInit | null;
  /**
   * If `true`, don't attach dev-auth headers even in dev. Useful for public
   * endpoints like sign-in flows.
   */
  skipDevAuth?: boolean;
  /**
   * If `true`, return the full `Response` instead of parsing JSON.
   * Useful for file downloads or empty 204s.
   */
  rawResponse?: boolean;
}

/**
 * Perform a credentialed JSON request.
 *
 * ```ts
 * const people = await apiFetch<PersonList>('/api/v1/people');
 * const created = await apiFetch<Person>('/api/v1/people', {
 *   method: 'POST',
 *   json: { firstName: 'Ada', lastName: 'Noah' },
 * });
 * ```
 *
 * The response body is parsed as JSON and, if it looks like `{ data: … }`,
 * unwrapped so callers consume the payload directly.
 */
export async function apiFetch<T = unknown>(
  input: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const {
    json,
    body,
    headers,
    skipDevAuth = false,
    rawResponse = false,
    ...rest
  } = options;

  const finalHeaders = new Headers(headers);
  if (!finalHeaders.has('Accept')) {
    finalHeaders.set('Accept', 'application/json');
  }

  let finalBody: BodyInit | null | undefined = body;
  if (json !== undefined && body === undefined) {
    finalBody = JSON.stringify(json);
    if (!finalHeaders.has('Content-Type')) {
      finalHeaders.set('Content-Type', 'application/json');
    }
  }

  if (!skipDevAuth && isDevAuthAllowed()) {
    const devHeaders = readDevHeaders();
    for (const [key, value] of Object.entries(devHeaders)) {
      if (!finalHeaders.has(key)) {
        finalHeaders.set(key, value);
      }
    }
  }

  const res = await fetch(input, {
    credentials: 'include',
    ...rest,
    headers: finalHeaders,
    body: finalBody,
  });

  if (rawResponse) {
    if (!res.ok) throw await buildApiError(res);
    return res as unknown as T;
  }

  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    throw await buildApiError(res);
  }

  const parsed = (await safeJson(res)) as unknown;
  // Our v1 API wraps collection + resource responses as `{ data, meta?, links? }`.
  // - With `meta` / `links`: return the full envelope (pagination callers need it).
  // - With only `data`: unwrap so feature code gets the resource / list array.
  // Callers that need the raw Response can set `rawResponse: true`.
  if (parsed !== null && typeof parsed === 'object' && 'data' in parsed) {
    const envelope = parsed as { data: T; meta?: unknown; links?: unknown };
    if ('meta' in envelope || 'links' in envelope) {
      return parsed as T;
    }
    return envelope.data;
  }
  return parsed as T;
}

async function buildApiError(res: Response): Promise<ApiError> {
  const body = await safeJson(res);
  const message =
    (body && typeof body === 'object' && 'error' in body
      ? String((body as { error: unknown }).error)
      : undefined) ||
    (body && typeof body === 'object' && 'message' in body
      ? String((body as { message: unknown }).message)
      : undefined) ||
    res.statusText ||
    `Request failed (${res.status})`;
  return new ApiError(message, res.status, body);
}

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (text === '') return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/** Whether to attach `x-dev-*` identity headers in the current build. */
export function isDevAuthAllowed(): boolean {
  return process.env.NEXT_PUBLIC_ALLOW_DEV_AUTH === '1';
}

/** Read dev-auth headers from `localStorage` (client only). */
export function readDevHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(DEV_HEADERS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'string' && key.toLowerCase().startsWith('x-dev-')) {
        out[key] = value;
      }
    }
    return out;
  } catch {
    return {};
  }
}

/** Write (or clear) dev-auth headers in `localStorage`. */
export function writeDevHeaders(headers: Record<string, string> | null): void {
  if (typeof window === 'undefined') return;
  if (!headers) {
    window.localStorage.removeItem(DEV_HEADERS_STORAGE_KEY);
    return;
  }
  const safe: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string' && key.toLowerCase().startsWith('x-dev-')) {
      safe[key] = value;
    }
  }
  window.localStorage.setItem(DEV_HEADERS_STORAGE_KEY, JSON.stringify(safe));
}
