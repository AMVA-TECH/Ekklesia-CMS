'use client';

import { useMemo } from 'react';
import { useSessionContext } from './session-context';
import { ROLE_CODES, type RoleCode } from './types';

/** Role helpers derived from the active session. */
export interface RoleHelpers {
  /** All active role codes for the current church. */
  roles: readonly string[];
  /** Flattened permissions across roles. */
  permissions: readonly string[];
  /** Whether the user holds the given role code. */
  hasRole: (code: RoleCode | string) => boolean;
  /** Whether the user holds any of the given role codes. */
  hasAnyRole: (...codes: Array<RoleCode | string>) => boolean;
  /** Whether the user has the given permission string. */
  can: (permission: string) => boolean;
  /** Convenience flags for common pilot roles. */
  isPlatformOperator: boolean;
  isChurchAdministrator: boolean;
  isFinanceOfficer: boolean;
  isMember: boolean;
}

/**
 * Hook returning role + permission helpers for the active session.
 *
 * ```tsx
 * const { isChurchAdministrator, can } = useRole();
 * if (can('people:write')) { … }
 * ```
 */
export function useRole(): RoleHelpers {
  const { session } = useSessionContext();

  return useMemo<RoleHelpers>(() => {
    const roleCodes = (session?.roles ?? []).map((r) => r.code);
    const roleSet = new Set(roleCodes);
    const permissions = session?.permissions ?? [];
    const permissionSet = new Set(permissions);
    const isPlatformOperator =
      session?.user.isPlatformOperator === true ||
      roleSet.has(ROLE_CODES.platformOperator);

    return {
      roles: roleCodes,
      permissions,
      hasRole: (code) => roleSet.has(code),
      hasAnyRole: (...codes) => codes.some((code) => roleSet.has(code)),
      can: (permission) => permissionSet.has(permission),
      isPlatformOperator,
      isChurchAdministrator: roleSet.has(ROLE_CODES.churchAdministrator),
      isFinanceOfficer: roleSet.has(ROLE_CODES.financeOfficer),
      isMember: roleSet.has(ROLE_CODES.member),
    };
  }, [session]);
}
