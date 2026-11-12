/**
 * Session types shared by the UI layer.
 *
 * Shapes track the `/api/v1/auth/me` response contract. They intentionally
 * use permissive fields (`unknown` escape hatch is NOT used — missing optional
 * fields are typed as `undefined`) so backend expansion doesn't break the UI.
 */

/** A single church membership visible to the current user. */
export interface SessionChurch {
  id: string;
  name: string;
  slug?: string;
}

/** A single assigned role in the active church. */
export interface SessionRole {
  /** Stable role code, e.g. `church_administrator`, `member`, `finance_officer`. */
  code: string;
  /** Human label for display in UI. */
  label?: string;
  /** Role-scoped permissions, when the backend attaches them. */
  permissions?: readonly string[];
}

/** The user portion of a session. */
export interface SessionUser {
  id: string;
  /** Preferred display name (full name, nickname, or email). */
  displayName: string;
  /** Email, when known. */
  email?: string;
  /** Phone in E.164, when known. */
  phoneE164?: string;
  /** Short avatar initials (precomputed by backend or UI). */
  initials?: string;
  /** Preferred UI locale, e.g. `en` or `sw`. */
  locale?: string;
  /** Whether the user is a platform operator (always visible across churches). */
  isPlatformOperator?: boolean;
}

/** Full session returned by the backend. */
export interface Session {
  user: SessionUser;
  /** Currently active church (what the UI is scoped to). */
  church: SessionChurch | null;
  /** All churches this user can switch into. */
  churches: readonly SessionChurch[];
  /** Roles the user holds in the active church. */
  roles: readonly SessionRole[];
  /** Flattened permissions from all active roles. */
  permissions: readonly string[];
}

/** Common Ekklesia role codes. Add new ones here as the backend introduces them. */
export const ROLE_CODES = {
  platformOperator: 'platform_operator',
  churchAdministrator: 'church_administrator',
  financeOfficer: 'finance_officer',
  ministryLeader: 'ministry_leader',
  pastor: 'pastor',
  member: 'member',
} as const;

/** Union of known role codes. Unknown backend codes remain valid at runtime. */
export type RoleCode = (typeof ROLE_CODES)[keyof typeof ROLE_CODES];

/** The three experience shells the UI can mount. */
export type ExperienceShell = 'admin' | 'member' | 'platform';
