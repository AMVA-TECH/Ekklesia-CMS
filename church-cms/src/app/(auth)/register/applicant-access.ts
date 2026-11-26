const STORAGE_PREFIX = 'join-req-access:';

/** Persist join-request status token for the same-browser journey. */
export function storeJoinAccessToken(
  requestId: string,
  accessToken: string,
): void {
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${requestId}`, accessToken);
  } catch {
    // Private mode / blocked storage — status URL with token still works.
  }
}

export function readJoinAccessToken(requestId: string): string | null {
  try {
    return sessionStorage.getItem(`${STORAGE_PREFIX}${requestId}`);
  } catch {
    return null;
  }
}

export function joinStatusPath(
  requestId: string,
  accessToken?: string | null,
): string {
  const params = new URLSearchParams({ requestId });
  if (accessToken) params.set('accessToken', accessToken);
  return `/register/status?${params.toString()}`;
}
