const STORAGE_PREFIX = 'church-reg-access:';

/** Persist applicant status token for the same-browser journey. */
export function storeApplicantAccessToken(
  applicationId: string,
  accessToken: string,
): void {
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${applicationId}`, accessToken);
  } catch {
    // Private mode / blocked storage — status URL with token still works.
  }
}

export function readApplicantAccessToken(
  applicationId: string,
): string | null {
  try {
    return sessionStorage.getItem(`${STORAGE_PREFIX}${applicationId}`);
  } catch {
    return null;
  }
}

export function statusPath(
  applicationId: string,
  accessToken?: string | null,
): string {
  const params = new URLSearchParams({ applicationId });
  if (accessToken) params.set('accessToken', accessToken);
  return `/register-church/status?${params.toString()}`;
}
