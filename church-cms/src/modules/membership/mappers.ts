import type { MembershipResponse } from './schemas';
import type { MembershipStatus, MembershipType } from './constants';

export interface MembershipRow {
  id: string;
  personId: string;
  householdId: string | null;
  membershipType: string;
  status: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export function toMembershipResponse(row: MembershipRow): MembershipResponse {
  return {
    id: row.id,
    personId: row.personId,
    householdId: row.householdId,
    membershipType: row.membershipType as MembershipType,
    status: row.status as MembershipStatus,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
  };
}
