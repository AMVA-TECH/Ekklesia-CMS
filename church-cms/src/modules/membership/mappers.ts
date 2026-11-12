import type { MembershipResponse } from './schemas';
import type {
  MembershipApplicationStatus,
  MembershipStatus,
  MembershipType,
} from './constants';
import type { membershipApplications, membershipStatusHistory } from './db-schema';

export interface MembershipRow {
  id: string;
  personId: string;
  householdId: string | null;
  membershipType: string;
  status: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}

type ApplicationRow = typeof membershipApplications.$inferSelect;

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

export function toMembershipApplicationResponse(row: ApplicationRow) {
  return {
    id: row.id,
    personId: row.personId,
    householdId: row.householdId,
    status: row.status as MembershipApplicationStatus,
    createdAt: row.createdAt.toISOString(),
  };
}

type StatusHistoryRow = typeof membershipStatusHistory.$inferSelect;

export function toMembershipStatusHistoryResponse(row: StatusHistoryRow) {
  return {
    id: row.id,
    membershipId: row.membershipId,
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    changedByUserId: row.changedByUserId,
    effectiveAt: row.effectiveAt.toISOString(),
    reason: row.reason,
  };
}
