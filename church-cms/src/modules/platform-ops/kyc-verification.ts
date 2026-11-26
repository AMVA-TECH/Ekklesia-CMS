/**
 * Guided KYC / onboarding verification for church registration applications.
 * Checklist lives in application.metadata.kycVerification (no schema migration).
 */

export const KYC_CHECK_KEYS = [
  'email_verified',
  'church_identity',
  'location_plausible',
  'representative_identity',
  'contact_reachable',
  'no_duplicate_tenant',
  'profile_completeness',
  'risk_accepted',
] as const;

export type KycCheckKey = (typeof KYC_CHECK_KEYS)[number];

export type KycCheckState = 'pending' | 'pass' | 'fail' | 'na';

export type KycCheck = {
  key: KycCheckKey;
  state: KycCheckState;
  note: string | null;
};

export type KycVerification = {
  version: 1;
  checks: KycCheck[];
  reviewerNotes: string | null;
  updatedAt: string | null;
  updatedByUserId: string | null;
  completedAt: string | null;
};

export const KYC_CHECK_LABELS: Record<
  KycCheckKey,
  { title: string; hint: string; step: number }
> = {
  email_verified: {
    title: 'Applicant email verified',
    hint: 'Confirm the verification timestamp exists before approving.',
    step: 1,
  },
  church_identity: {
    title: 'Church identity confirmed',
    hint: 'Official name, display name, denomination and description look genuine.',
    step: 2,
  },
  location_plausible: {
    title: 'Location / address plausible',
    hint: 'Country, location and address match a real congregation footprint.',
    step: 2,
  },
  representative_identity: {
    title: 'Representative identity confirmed',
    hint: 'Name and role are consistent; person can speak for the church.',
    step: 3,
  },
  contact_reachable: {
    title: 'Contact channels reachable',
    hint: 'Email / phone look valid and preferred contact is sensible.',
    step: 3,
  },
  no_duplicate_tenant: {
    title: 'No duplicate tenant',
    hint: 'Search did not find an existing church that is the same congregation.',
    step: 4,
  },
  profile_completeness: {
    title: 'Profile complete enough to provision',
    hint: 'Enough fields to create the tenant and invite an admin.',
    step: 4,
  },
  risk_accepted: {
    title: 'Onboarding risk accepted',
    hint: 'Reviewer accepts residual risk for this applicant.',
    step: 4,
  },
};

export function emptyKycVerification(): KycVerification {
  return {
    version: 1,
    checks: KYC_CHECK_KEYS.map((key) => ({
      key,
      state: 'pending',
      note: null,
    })),
    reviewerNotes: null,
    updatedAt: null,
    updatedByUserId: null,
    completedAt: null,
  };
}

export function parseKycVerification(
  metadata: Record<string, unknown> | null | undefined,
): KycVerification {
  const raw = metadata?.kycVerification;
  const base = emptyKycVerification();
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;
  const checksIn = Array.isArray(obj.checks) ? obj.checks : [];
  const byKey = new Map<string, KycCheck>();
  for (const item of checksIn) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const key = String(row.key ?? '');
    if (!(KYC_CHECK_KEYS as readonly string[]).includes(key)) continue;
    const state = String(row.state ?? 'pending');
    if (!['pending', 'pass', 'fail', 'na'].includes(state)) continue;
    byKey.set(key, {
      key: key as KycCheckKey,
      state: state as KycCheckState,
      note: typeof row.note === 'string' ? row.note : null,
    });
  }
  return {
    version: 1,
    checks: KYC_CHECK_KEYS.map(
      (key) => byKey.get(key) ?? { key, state: 'pending', note: null },
    ),
    reviewerNotes:
      typeof obj.reviewerNotes === 'string' ? obj.reviewerNotes : null,
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : null,
    updatedByUserId:
      typeof obj.updatedByUserId === 'string' ? obj.updatedByUserId : null,
    completedAt: typeof obj.completedAt === 'string' ? obj.completedAt : null,
  };
}

/** Auto-mark email_verified from application data when building the view model. */
export function withAutoEmailCheck(
  verification: KycVerification,
  emailVerifiedAt: string | null,
): KycVerification {
  return {
    ...verification,
    checks: verification.checks.map((c) => {
      if (c.key !== 'email_verified') return c;
      if (emailVerifiedAt) {
        return {
          ...c,
          state: c.state === 'fail' ? 'fail' : 'pass',
          note: c.note ?? `Verified at ${emailVerifiedAt}`,
        };
      }
      return { ...c, state: c.state === 'pass' ? 'pending' : c.state };
    }),
  };
}

export function kycBlockingIssues(verification: KycVerification): string[] {
  const issues: string[] = [];
  for (const check of verification.checks) {
    if (check.state === 'fail') {
      issues.push(`${KYC_CHECK_LABELS[check.key].title} failed`);
    }
    if (check.state === 'pending') {
      issues.push(`${KYC_CHECK_LABELS[check.key].title} still pending`);
    }
  }
  return issues;
}

export function kycIsComplete(verification: KycVerification): boolean {
  return verification.checks.every(
    (c) => c.state === 'pass' || c.state === 'na',
  );
}
