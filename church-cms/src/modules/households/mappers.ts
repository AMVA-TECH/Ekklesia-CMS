import type { HouseholdResponse } from './schemas';

export function toHouseholdResponse(
  household: {
    id: string;
    label: string;
    sharedAddress: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
  },
  members: Array<{
    id: string;
    personId: string;
    relationship: string;
    isPrimaryContact: boolean;
  }>,
  children: Array<{ id: string; name: string; age: number }>,
): HouseholdResponse {
  return {
    id: household.id,
    label: household.label,
    sharedAddress: household.sharedAddress,
    emergencyContactName: household.emergencyContactName,
    emergencyContactPhone: household.emergencyContactPhone,
    members,
    children,
  };
}
