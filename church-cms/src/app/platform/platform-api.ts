'use client';

/** Dev platform-operator headers (ALLOW_DEV_AUTH=1). */
export const PLATFORM_DEV_HEADERS: Record<string, string> = {
  'x-dev-user-id': 'cccccccc-0001-0001-0001-000000000004',
  'x-dev-platform-operator': '1',
  'x-dev-platform-permissions':
    'platform:read,platform:admin,platform:impersonate_tenant,platform:security_read',
};

export async function platformApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...PLATFORM_DEV_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
