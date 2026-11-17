/** `GET /api/v1/projects[/:id]` shapes. Detail adds the optional arrays. */
export interface Project {
  id: string;
  name: string;
  description: string | null;
  organisationalUnitId: string | null;
  fundId: string | null;
  budgetId: string | null;
  targetAmountMinor: number | null;
  currency: string;
  status: 'active' | 'closed';
  startsOn: string | null;
  endsOn: string | null;
  raisedMinor?: number;
  assignments?: Array<{ id: string; personId: string; role: string | null; status: string }>;
  contributions?: Array<{
    id: string;
    personId: string | null;
    amountMinor: number;
    currency: string;
    contributedOn: string;
    journalId: string | null;
  }>;
  interestRequests?: Array<{
    id: string;
    projectId: string;
    personId: string;
    note: string | null;
    status: string;
    createdAt: string;
  }>;
}
