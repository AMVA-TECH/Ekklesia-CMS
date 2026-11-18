/** Session key — cinematic intro plays once per browser tab session. */
export const EKKLESIA_INTRO_SESSION_KEY = 'ekklesia.intro.seen';

export function hasSeenEkklesiaIntro(): boolean {
  try {
    return sessionStorage.getItem(EKKLESIA_INTRO_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function markEkklesiaIntroSeen(): void {
  try {
    sessionStorage.setItem(EKKLESIA_INTRO_SESSION_KEY, '1');
  } catch {
    // Private mode / blocked storage — intro may replay; acceptable fallback.
  }
}
