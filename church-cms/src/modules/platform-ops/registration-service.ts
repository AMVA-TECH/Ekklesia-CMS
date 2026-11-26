import { createHash, randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';

import type { PlatformCtx } from '@/platform/auth';
import { provisionCredentialAccount } from '@/platform/auth';
import { user as authUser } from '@/platform/auth/db-schema';
import { getDb } from '@/platform/db/client';
import { newId } from '@/platform/db/ids';
import { writePlatformAudit } from '@/platform/audit';
import { sanitizeAuditMetadata } from '@/platform/audit/sanitize';
import {
  conflict,
  forbidden,
  notFound,
  rateLimited,
  validationFailed,
} from '@/platform/errors';
import { loadResolvedGlobalConfig } from './runtime-config';
import {
  assertPlatformApplicationsDecide,
  assertPlatformApplicationsReview,
  assertPlatformChurchesWrite,
} from './policies';
import * as churchRepo from './repository';
import * as regRepo from './registration-repository';
import {
  ADMIN_INVITE_TTL_MS,
  EMAIL_VERIFY_TTL_MS,
  PUBLIC_REGISTRATION_RATE_MAX,
  PUBLIC_REGISTRATION_RATE_WINDOW_MS,
} from './registration-constants';
import type {
  AcceptAdminInviteBody,
  AssignApplicationBody,
  DecideApplicationBody,
  ListApplicationsQuery,
  PatchTenantLifecycleBody,
  SubmitChurchRegistrationBody,
  VerifyRegistrationEmailBody,
} from './registration-schemas';
import {
  sendAdminInviteEmail,
  sendRegistrationVerifyEmail,
} from './registration-mail';
import { slugifyChurchName } from './slug';

const submitBuckets = new Map<string, { count: number; resetAt: number }>();

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function newOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

function appOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    'http://localhost:3000'
  );
}

function assertPublicRateLimit(bucketKey: string): void {
  const now = Date.now();
  const existing = submitBuckets.get(bucketKey);
  if (!existing || existing.resetAt <= now) {
    submitBuckets.set(bucketKey, {
      count: 1,
      resetAt: now + PUBLIC_REGISTRATION_RATE_WINDOW_MS,
    });
    return;
  }
  if (existing.count >= PUBLIC_REGISTRATION_RATE_MAX) {
    throw rateLimited('Too many registration attempts. Try again later.');
  }
  existing.count += 1;
}

function publicApplicationView(row: {
  id: string;
  status: string;
  officialName: string;
  emailVerifiedAt: Date | null;
  decidedAt: Date | null;
  resultingChurchId: string | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    status: row.status,
    officialName: row.officialName,
    emailVerified: Boolean(row.emailVerifiedAt),
    decidedAt: row.decidedAt?.toISOString() ?? null,
    resultingChurchId: row.resultingChurchId,
    createdAt: row.createdAt.toISOString(),
  };
}

type ApplicantStage =
  | 'verify_email'
  | 'in_review'
  | 'rejected'
  | 'provisioning'
  | 'activate'
  | 'active';

type ApplicantStepState = 'done' | 'current' | 'upcoming' | 'failed';

function buildApplicantJourney(input: {
  status: string;
  emailVerified: boolean;
  decisionNote: string | null;
  provisioningStatus: string | null;
  churchLifecycle: string | null;
  churchName: string | null;
  churchSlug: string | null;
}) {
  let stage: ApplicantStage = 'verify_email';
  if (input.status === 'rejected') {
    stage = 'rejected';
  } else if (input.churchLifecycle === 'active') {
    stage = 'active';
  } else if (
    input.provisioningStatus === 'succeeded' ||
    input.churchLifecycle === 'pending_activation'
  ) {
    stage = 'activate';
  } else if (
    input.status === 'approved' ||
    input.provisioningStatus === 'queued' ||
    input.provisioningStatus === 'running' ||
    input.provisioningStatus === 'failed'
  ) {
    stage = 'provisioning';
  } else if (input.emailVerified) {
    stage = 'in_review';
  }

  const messages: Record<ApplicantStage, string> = {
    verify_email:
      'Confirm your email using the link we sent. Review starts after verification.',
    in_review:
      'Your application is with the Ekklesia platform team for verification. We will email you when a decision is made.',
    rejected:
      input.decisionNote?.trim() ||
      'Your application was not approved. Contact support if you have questions.',
    provisioning:
      input.provisioningStatus === 'failed'
        ? 'We hit a problem creating your church workspace. Our team has been notified and will retry.'
        : 'Your application was approved. We are creating your church workspace.',
    activate:
      'Your church workspace is ready. Check your email for the activation link to set your administrator PIN.',
    active:
      'Your church is active. Sign in with your email and PIN to open Church Admin.',
  };

  const order: ApplicantStage[] = [
    'verify_email',
    'in_review',
    'provisioning',
    'activate',
    'active',
  ];

  function stepState(key: ApplicantStage): ApplicantStepState {
    if (stage === 'rejected') {
      if (key === 'verify_email') return input.emailVerified ? 'done' : 'failed';
      if (key === 'in_review') return 'failed';
      return 'upcoming';
    }
    const stageIdx = order.indexOf(stage);
    const keyIdx = order.indexOf(key);
    if (keyIdx < 0) return 'upcoming';
    if (key === 'provisioning' && input.provisioningStatus === 'failed') {
      return 'failed';
    }
    if (keyIdx < stageIdx) return 'done';
    if (keyIdx === stageIdx) return 'current';
    return 'upcoming';
  }

  const steps: Array<{
    key: ApplicantStage;
    label: string;
    state: ApplicantStepState;
  }> = [
    { key: 'verify_email', label: 'Verify email', state: stepState('verify_email') },
    { key: 'in_review', label: 'Platform review', state: stepState('in_review') },
    {
      key: 'provisioning',
      label: 'Create workspace',
      state: stepState('provisioning'),
    },
    { key: 'activate', label: 'Activate admin', state: stepState('activate') },
    { key: 'active', label: 'Church ready', state: stepState('active') },
  ];

  return {
    stage,
    stageLabel: {
      verify_email: 'Verify your email',
      in_review: 'Under review',
      rejected: 'Not approved',
      provisioning: 'Creating your church',
      activate: 'Activate your church',
      active: 'Ready to sign in',
    }[stage],
    message: messages[stage],
    provisioningStatus: input.provisioningStatus,
    church:
      input.churchName && input.churchSlug
        ? {
            name: input.churchName,
            slug: input.churchSlug,
            lifecycleStatus: input.churchLifecycle,
          }
        : null,
    steps,
  };
}

/** Public: submit a church-tenant registration application (no session). */
export async function submitChurchRegistration(
  body: SubmitChurchRegistrationBody,
  opts?: { clientKey?: string },
) {
  assertPublicRateLimit(opts?.clientKey?.trim() || body.email.toLowerCase());

  const db = getDb();
  const globalCfg = await loadResolvedGlobalConfig(db);
  if (!globalCfg.featureFlags.publicChurchRegistration) {
    throw forbidden('Public church registration is currently closed.');
  }
  const email = body.email.trim().toLowerCase();

  if (body.idempotencyKey) {
    const existing = await regRepo.findApplicationByIdempotencyKey(
      db,
      body.idempotencyKey,
    );
    if (existing) {
      return {
        ...publicApplicationView(existing),
        replayed: true as const,
        /** Access token only returned on first create — omit on replay. */
        accessToken: null as string | null,
        verifyTokenDev:
          process.env.NODE_ENV !== 'production' ? null : undefined,
      };
    }
  }

  const id = newId();
  const verifyToken = newOpaqueToken();
  const accessToken = newOpaqueToken();
  const verifyExpires = new Date(Date.now() + EMAIL_VERIFY_TTL_MS);

  await regRepo.insertApplication(db, {
    id,
    officialName: body.officialName.trim(),
    displayName: body.displayName?.trim() || null,
    website: body.website?.trim() || null,
    country: body.country.trim().toUpperCase(),
    location: body.location?.trim() || null,
    address: body.address?.trim() || null,
    denomination: body.denomination?.trim() || null,
    yearEstablished: body.yearEstablished ?? null,
    description: body.description?.trim() || null,
    approxSize: body.approxSize?.trim() || null,
    branchCount: body.branchCount ?? null,
    representativeName: body.representativeName.trim(),
    representativeRole: body.representativeRole?.trim() || null,
    email,
    phoneE164: body.phoneE164 ?? null,
    preferredContact: body.preferredContact,
    emailVerifyTokenHash: hashToken(verifyToken),
    emailVerifyExpiresAt: verifyExpires,
    applicantAccessTokenHash: hashToken(accessToken),
    idempotencyKey: body.idempotencyKey ?? null,
  });

  await regRepo.insertRegistrationEvent(db, {
    applicationId: id,
    eventType: 'submitted',
    metadata: { email },
  });

  const verifyUrl = `${appOrigin()}/register-church/verify?applicationId=${id}&token=${encodeURIComponent(verifyToken)}`;
  await sendRegistrationVerifyEmail({
    to: email,
    verifyUrl,
    churchName: body.officialName.trim(),
  });

  return {
    id,
    status: 'submitted' as const,
    officialName: body.officialName.trim(),
    emailVerified: false,
    decidedAt: null,
    resultingChurchId: null,
    createdAt: new Date().toISOString(),
    replayed: false as const,
    accessToken,
    ...(process.env.NODE_ENV !== 'production'
      ? { verifyTokenDev: verifyToken }
      : {}),
  };
}

/** Public: confirm applicant email. */
export async function verifyRegistrationEmail(
  body: VerifyRegistrationEmailBody,
) {
  const db = getDb();
  const app = await regRepo.findApplicationById(db, body.applicationId);
  if (!app) throw notFound('Application not found.');

  if (app.emailVerifiedAt) {
    return publicApplicationView(app);
  }

  if (
    !app.emailVerifyTokenHash ||
    app.emailVerifyTokenHash !== hashToken(body.token)
  ) {
    throw validationFailed([
      { field: 'token', code: 'invalid', message: 'Invalid verification token.' },
    ]);
  }
  if (
    app.emailVerifyExpiresAt &&
    app.emailVerifyExpiresAt.getTime() < Date.now()
  ) {
    throw validationFailed([
      {
        field: 'token',
        code: 'expired',
        message: 'Verification link expired. Submit a new application.',
      },
    ]);
  }

  if (app.status !== 'submitted' && app.status !== 'draft') {
    throw conflict('Application is not awaiting email verification.');
  }

  await regRepo.updateApplication(db, app.id, {
    status: 'email_verified',
    emailVerifiedAt: new Date(),
    emailVerifyTokenHash: null,
    emailVerifyExpiresAt: null,
  });
  await regRepo.insertRegistrationEvent(db, {
    applicationId: app.id,
    eventType: 'email_verified',
  });

  const updated = await regRepo.findApplicationById(db, app.id);
  return publicApplicationView(updated!);
}

/** Public: applicant status poll (access token required). */
export async function getPublicRegistrationStatus(
  applicationId: string,
  accessToken: string,
) {
  const db = getDb();
  const app = await regRepo.findApplicationById(db, applicationId);
  if (!app) throw notFound('Application not found.');
  if (
    !app.applicantAccessTokenHash ||
    app.applicantAccessTokenHash !== hashToken(accessToken)
  ) {
    throw notFound('Application not found.');
  }

  const provisioning = await regRepo.findProvisioningByApplicationId(
    db,
    app.id,
  );
  const churchId = app.resultingChurchId ?? provisioning?.churchId ?? null;
  const church = churchId
    ? await regRepo.getChurchLifecycle(db, churchId)
    : null;

  const base = publicApplicationView(app);
  const journey = buildApplicantJourney({
    status: app.status,
    emailVerified: Boolean(app.emailVerifiedAt),
    decisionNote: app.decisionNote,
    provisioningStatus: provisioning?.status ?? null,
    churchLifecycle: church?.lifecycleStatus ?? null,
    churchName: church?.name ?? null,
    churchSlug: church?.slug ?? null,
  });

  return {
    ...base,
    ...journey,
  };
}

export async function listChurchApplications(
  ctx: PlatformCtx,
  query: ListApplicationsQuery,
) {
  assertPlatformApplicationsReview(ctx);
  const db = getDb();
  const items = await regRepo.listApplications(db, query);
  await writePlatformAudit(db, ctx, {
    action: 'platform.applications.list',
    entityType: 'church_registration_application',
    metadata: { status: query.status ?? null, count: items.length },
  });
  return {
    items: items.map((row) => ({
      id: row.id,
      status: row.status,
      officialName: row.officialName,
      displayName: row.displayName,
      country: row.country,
      location: row.location,
      email: row.email,
      representativeName: row.representativeName,
      emailVerifiedAt: row.emailVerifiedAt?.toISOString() ?? null,
      assignedReviewerUserId: row.assignedReviewerUserId,
      decidedAt: row.decidedAt?.toISOString() ?? null,
      resultingChurchId: row.resultingChurchId,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export async function getChurchApplication(
  ctx: PlatformCtx,
  applicationId: string,
) {
  assertPlatformApplicationsReview(ctx);
  const db = getDb();
  const app = await regRepo.findApplicationById(db, applicationId);
  if (!app) throw notFound();
  const events = await regRepo.listRegistrationEvents(db, applicationId);
  const provisioning = await regRepo.findProvisioningByApplicationId(
    db,
    applicationId,
  );

  await writePlatformAudit(db, ctx, {
    action: 'platform.application.read',
    entityType: 'church_registration_application',
    entityId: applicationId,
  });

  const {
    parseKycVerification,
    withAutoEmailCheck,
    kycIsComplete,
    kycBlockingIssues,
    KYC_CHECK_LABELS,
  } = await import('./kyc-verification');
  const emailVerifiedAt = app.emailVerifiedAt?.toISOString() ?? null;
  const verification = withAutoEmailCheck(
    parseKycVerification(app.metadata ?? {}),
    emailVerifiedAt,
  );

  // Soft duplicate hints for guided review (name / email collisions).
  const slugHint = slugifyChurchName(app.displayName || app.officialName);
  const [slugConflict, emailConflict] = await Promise.all([
    churchRepo.findChurchBySlug(db, slugHint),
    churchRepo.findUserAccountByEmail(db, app.email),
  ]);

  return {
    application: {
      id: app.id,
      status: app.status,
      officialName: app.officialName,
      displayName: app.displayName,
      website: app.website,
      country: app.country,
      location: app.location,
      address: app.address,
      denomination: app.denomination,
      yearEstablished: app.yearEstablished,
      description: app.description,
      approxSize: app.approxSize,
      branchCount: app.branchCount,
      representativeName: app.representativeName,
      representativeRole: app.representativeRole,
      email: app.email,
      phoneE164: app.phoneE164,
      preferredContact: app.preferredContact,
      emailVerifiedAt,
      assignedReviewerUserId: app.assignedReviewerUserId,
      assignedAt: app.assignedAt?.toISOString() ?? null,
      decisionNote: app.decisionNote,
      decidedByUserId: app.decidedByUserId,
      decidedAt: app.decidedAt?.toISOString() ?? null,
      resultingChurchId: app.resultingChurchId,
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString(),
    },
    verification: {
      ...verification,
      complete: kycIsComplete(verification),
      blockingIssues: kycBlockingIssues(verification),
      labels: KYC_CHECK_LABELS,
    },
    hints: {
      suggestedSlug: slugHint,
      slugAlreadyTaken: Boolean(slugConflict),
      adminEmailAlreadyRegistered: Boolean(emailConflict),
    },
    events: events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      actorUserId: e.actorUserId,
      note: e.note,
      metadata: sanitizeAuditMetadata(e.metadata ?? {}),
      createdAt: e.createdAt.toISOString(),
    })),
    provisioning: provisioning
      ? {
          id: provisioning.id,
          status: provisioning.status,
          churchId: provisioning.churchId,
          adminUserAccountId: provisioning.adminUserAccountId,
          errorMessage: provisioning.errorMessage,
          attemptCount: provisioning.attemptCount,
          startedAt: provisioning.startedAt?.toISOString() ?? null,
          completedAt: provisioning.completedAt?.toISOString() ?? null,
        }
      : null,
  };
}

export async function saveApplicationKycVerification(
  ctx: PlatformCtx,
  applicationId: string,
  body: import('./registration-schemas').SaveApplicationKycBody,
) {
  assertPlatformApplicationsReview(ctx);
  const db = getDb();
  const app = await regRepo.findApplicationById(db, applicationId);
  if (!app) throw notFound();
  if (app.status === 'approved' || app.status === 'rejected') {
    throw conflict('Verification is locked after a decision.');
  }

  const {
    parseKycVerification,
    withAutoEmailCheck,
    kycIsComplete,
    emptyKycVerification,
    KYC_CHECK_KEYS,
  } = await import('./kyc-verification');
  type KycVerification = import('./kyc-verification').KycVerification;
  type RegistrationStatus = import('./registration-constants').RegistrationStatus;

  const current = parseKycVerification(app.metadata ?? {});
  const nextMap = new Map(current.checks.map((c) => [c.key, c]));
  for (const row of body.checks) {
    nextMap.set(row.key, {
      key: row.key,
      state: row.state,
      note: row.note ?? null,
    });
  }

  let verification: KycVerification = {
    ...emptyKycVerification(),
    checks: KYC_CHECK_KEYS.map(
      (key) => nextMap.get(key) ?? { key, state: 'pending' as const, note: null },
    ),
    reviewerNotes:
      body.reviewerNotes === undefined
        ? current.reviewerNotes
        : body.reviewerNotes,
    updatedAt: new Date().toISOString(),
    updatedByUserId: ctx.actor.userAccountId,
    completedAt: null,
  };
  verification = withAutoEmailCheck(
    verification,
    app.emailVerifiedAt?.toISOString() ?? null,
  );
  if (kycIsComplete(verification)) {
    verification = {
      ...verification,
      completedAt: new Date().toISOString(),
    };
  }

  const metadata = {
    ...(app.metadata ?? {}),
    kycVerification: verification,
  };

  const nextStatus: RegistrationStatus =
    app.status === 'submitted' || app.status === 'email_verified'
      ? 'under_review'
      : (app.status as RegistrationStatus);

  await regRepo.updateApplication(db, applicationId, {
    metadata,
    status: nextStatus,
    assignedReviewerUserId:
      app.assignedReviewerUserId ?? ctx.actor.userAccountId,
    assignedAt: app.assignedAt ?? new Date(),
    updatedBy: ctx.actor.userAccountId,
  });
  await regRepo.insertRegistrationEvent(db, {
    applicationId,
    eventType: 'kyc_verification_updated',
    actorUserId: ctx.actor.userAccountId,
    note: body.reviewerNotes ?? null,
    metadata: sanitizeAuditMetadata({
      complete: kycIsComplete(verification),
      checks: verification.checks.map((c) => ({
        key: c.key,
        state: c.state,
      })),
    }),
  });
  await writePlatformAudit(db, ctx, {
    action: 'platform.application.kyc_updated',
    entityType: 'church_registration_application',
    entityId: applicationId,
    metadata: sanitizeAuditMetadata({
      complete: kycIsComplete(verification),
    }),
  });

  return getChurchApplication(ctx, applicationId);
}

export async function assignChurchApplication(
  ctx: PlatformCtx,
  applicationId: string,
  body: AssignApplicationBody,
) {
  assertPlatformApplicationsReview(ctx);
  const db = getDb();
  const app = await regRepo.findApplicationById(db, applicationId);
  if (!app) throw notFound();

  if (
    app.status !== 'email_verified' &&
    app.status !== 'under_review' &&
    app.status !== 'submitted'
  ) {
    throw conflict('Application cannot be assigned in its current status.');
  }

  const reviewerUserId =
    body.reviewerUserId ?? ctx.actor.userAccountId;

  await regRepo.updateApplication(db, applicationId, {
    status: 'under_review',
    assignedReviewerUserId: reviewerUserId,
    assignedAt: new Date(),
    updatedBy: ctx.actor.userAccountId,
  });
  await regRepo.insertRegistrationEvent(db, {
    applicationId,
    eventType: 'assigned',
    actorUserId: ctx.actor.userAccountId,
    metadata: { reviewerUserId },
  });
  await writePlatformAudit(db, ctx, {
    action: 'platform.application.assigned',
    entityType: 'church_registration_application',
    entityId: applicationId,
    metadata: { reviewerUserId },
  });

  return getChurchApplication(ctx, applicationId);
}

/**
 * Approve or reject. Approval queues async provisioning (does not create tenant inline).
 * Returns `provisioningRequestId` when approved so the route can schedule work.
 */
export async function decideChurchApplication(
  ctx: PlatformCtx,
  applicationId: string,
  body: DecideApplicationBody,
): Promise<{
  application: Awaited<ReturnType<typeof getChurchApplication>>;
  provisioningRequestId: string | null;
}> {
  assertPlatformApplicationsDecide(ctx);
  const db = getDb();
  const app = await regRepo.findApplicationById(db, applicationId);
  if (!app) throw notFound();

  if (app.status === 'approved' || app.status === 'rejected') {
    throw conflict('Application was already decided.');
  }
  if (
    app.status !== 'email_verified' &&
    app.status !== 'under_review' &&
    app.status !== 'submitted'
  ) {
    throw conflict('Application cannot be decided in its current status.');
  }
  if (!app.emailVerifiedAt && body.decision === 'approve') {
    throw conflict('Email must be verified before approval.');
  }
  if (body.decision === 'approve') {
    const {
      parseKycVerification,
      withAutoEmailCheck,
      kycIsComplete,
      kycBlockingIssues,
    } = await import('./kyc-verification');
    const verification = withAutoEmailCheck(
      parseKycVerification(app.metadata ?? {}),
      app.emailVerifiedAt?.toISOString() ?? null,
    );
    if (!kycIsComplete(verification)) {
      throw conflict(
        `Complete guided KYC verification before approval: ${kycBlockingIssues(verification).join('; ')}`,
      );
    }
  }

  if (body.decision === 'reject') {
    await regRepo.updateApplication(db, applicationId, {
      status: 'rejected',
      decisionNote: body.note?.trim() || null,
      decidedByUserId: ctx.actor.userAccountId,
      decidedAt: new Date(),
      updatedBy: ctx.actor.userAccountId,
    });
    await regRepo.insertRegistrationEvent(db, {
      applicationId,
      eventType: 'rejected',
      actorUserId: ctx.actor.userAccountId,
      note: body.note?.trim() || null,
    });
    await writePlatformAudit(db, ctx, {
      action: 'platform.application.rejected',
      entityType: 'church_registration_application',
      entityId: applicationId,
      metadata: sanitizeAuditMetadata({ note: body.note }),
    });
    return {
      application: await getChurchApplication(ctx, applicationId),
      provisioningRequestId: null,
    };
  }

  const slug =
    body.slug?.trim() ||
    slugifyChurchName(app.displayName || app.officialName);
  if (await churchRepo.findChurchBySlug(db, slug)) {
    throw conflict('A church with this slug already exists.');
  }
  if (await churchRepo.findUserAccountByEmail(db, app.email)) {
    throw conflict('An account with this applicant email already exists.');
  }
  if (
    app.phoneE164 &&
    (await churchRepo.findUserAccountByPhone(db, app.phoneE164))
  ) {
    throw conflict('An account with this applicant phone already exists.');
  }

  const existingProv = await regRepo.findProvisioningByApplicationId(
    db,
    applicationId,
  );
  if (existingProv && existingProv.status !== 'failed') {
    throw conflict('Provisioning already exists for this application.');
  }

  const provisioningId = existingProv?.id ?? newId();
  const idempotencyKey = `provision:${applicationId}`;

  if (!existingProv) {
    await regRepo.insertProvisioningRequest(db, {
      id: provisioningId,
      applicationId,
      idempotencyKey,
      status: 'queued',
      createdBy: ctx.actor.userAccountId,
      metadata: {
        slug,
        timezone: body.timezone ?? 'Africa/Dar_es_Salaam',
        defaultLocale: body.defaultLocale ?? 'sw',
      },
    });
  } else {
    await regRepo.updateProvisioning(db, provisioningId, {
      status: 'queued',
      errorMessage: null,
      metadata: {
        ...(existingProv.metadata ?? {}),
        slug,
        timezone: body.timezone ?? 'Africa/Dar_es_Salaam',
        defaultLocale: body.defaultLocale ?? 'sw',
      },
      updatedBy: ctx.actor.userAccountId,
    });
  }

  await regRepo.updateApplication(db, applicationId, {
    status: 'approved',
    decisionNote: body.note?.trim() || null,
    decidedByUserId: ctx.actor.userAccountId,
    decidedAt: new Date(),
    updatedBy: ctx.actor.userAccountId,
  });
  await regRepo.insertRegistrationEvent(db, {
    applicationId,
    eventType: 'approved',
    actorUserId: ctx.actor.userAccountId,
    note: body.note?.trim() || null,
    metadata: { provisioningId, slug },
  });
  await writePlatformAudit(db, ctx, {
    action: 'platform.application.approved',
    entityType: 'church_registration_application',
    entityId: applicationId,
    metadata: { provisioningId, slug },
  });

  return {
    application: await getChurchApplication(ctx, applicationId),
    provisioningRequestId: provisioningId,
  };
}

/**
 * Idempotent tenant provisioner. Safe to retry.
 * Creates church in pending_activation + admin invite (no PIN until accept).
 */
export async function runTenantProvisioning(
  provisioningRequestId: string,
): Promise<{ ok: boolean; status: string; churchId?: string }> {
  const db = getDb();
  let req = await regRepo.findProvisioningById(db, provisioningRequestId);
  if (!req) return { ok: false, status: 'missing' };

  if (req.status === 'succeeded') {
    return {
      ok: true,
      status: 'succeeded',
      churchId: req.churchId ?? undefined,
    };
  }

  if (req.status === 'queued') {
    const claimed = await regRepo.claimQueuedProvisioning(db, req.id);
    if (!claimed) {
      req = await regRepo.findProvisioningById(db, provisioningRequestId);
      if (req?.status === 'succeeded') {
        return {
          ok: true,
          status: 'succeeded',
          churchId: req.churchId ?? undefined,
        };
      }
      return { ok: false, status: req?.status ?? 'busy' };
    }
  } else if (req.status === 'failed') {
    const claimed = await regRepo.claimFailedProvisioningForRetry(db, req.id);
    if (!claimed) return { ok: false, status: 'busy' };
  } else if (req.status === 'running') {
    return { ok: false, status: 'running' };
  } else {
    return { ok: false, status: req.status };
  }

  req = (await regRepo.findProvisioningById(db, provisioningRequestId))!;
  const app = await regRepo.findApplicationById(db, req.applicationId);
  if (!app) {
    await regRepo.updateProvisioning(db, req.id, {
      status: 'failed',
      errorMessage: 'Application missing',
      completedAt: new Date(),
    });
    return { ok: false, status: 'failed' };
  }

  const meta = (req.metadata ?? {}) as {
    slug?: string;
    timezone?: string;
    defaultLocale?: string;
  };
  const slug =
    meta.slug?.trim() ||
    slugifyChurchName(app.displayName || app.officialName);
  const timezone = meta.timezone ?? 'Africa/Dar_es_Salaam';
  const defaultLocale = (meta.defaultLocale as 'en' | 'sw') ?? 'sw';
  const actorUserId = app.decidedByUserId ?? app.assignedReviewerUserId;

  try {
    if (await churchRepo.findChurchBySlug(db, slug)) {
      throw new Error('Slug conflict during provision');
    }
    if (await churchRepo.findUserAccountByEmail(db, app.email)) {
      throw new Error('Admin email already registered');
    }

    const churchId = newId();
    const personId = newId();
    const userAccountId = newId();
    const inviteToken = newOpaqueToken();

    await churchRepo.insertChurch(db, {
      id: churchId,
      name: (app.displayName || app.officialName).trim(),
      slug,
      timezone,
      defaultLocale,
      actorUserId: actorUserId ?? churchId,
      lifecycleStatus: 'pending_activation',
    });

    const { administratorRoleId } = await churchRepo.bootstrapChurchRoles(
      db,
      churchId,
      actorUserId ?? churchId,
    );

    await churchRepo.insertChurchAdminBundle(db, {
      churchId,
      actorUserId: actorUserId ?? churchId,
      administratorRoleId,
      personId,
      userAccountId,
      displayName: app.representativeName.trim(),
      email: app.email,
      phoneE164: app.phoneE164,
    });

    await churchRepo.insertDefaultEventTypes(
      db,
      churchId,
      actorUserId ?? userAccountId,
    );

    await regRepo.updateProvisioning(db, req.id, {
      status: 'succeeded',
      churchId,
      adminUserAccountId: userAccountId,
      adminInviteTokenHash: hashToken(inviteToken),
      adminInviteExpiresAt: new Date(Date.now() + ADMIN_INVITE_TTL_MS),
      completedAt: new Date(),
      errorMessage: null,
    });
    await regRepo.updateApplication(db, app.id, {
      resultingChurchId: churchId,
    });
    await regRepo.insertRegistrationEvent(db, {
      applicationId: app.id,
      eventType: 'provisioned',
      actorUserId: actorUserId ?? null,
      metadata: { churchId, userAccountId },
    });

    const inviteUrl = `${appOrigin()}/activate-church?token=${encodeURIComponent(inviteToken)}`;
    await sendAdminInviteEmail({
      to: app.email,
      inviteUrl,
      churchName: app.officialName,
    });

    return { ok: true, status: 'succeeded', churchId };
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 400) : 'provision_failed';
    await regRepo.updateProvisioning(db, req.id, {
      status: 'failed',
      errorMessage: message,
      completedAt: new Date(),
    });
    await regRepo.insertRegistrationEvent(db, {
      applicationId: app.id,
      eventType: 'provision_failed',
      metadata: { error: message },
    });
    return { ok: false, status: 'failed' };
  }
}

export async function retryTenantProvisioning(
  ctx: PlatformCtx,
  provisioningRequestId: string,
): Promise<{
  provisioningRequestId: string;
  status: 'queued' | 'succeeded';
  churchId?: string | null;
}> {
  assertPlatformApplicationsDecide(ctx);
  const db = getDb();
  const req = await regRepo.findProvisioningById(db, provisioningRequestId);
  if (!req) throw notFound();
  if (req.status === 'succeeded') {
    return {
      provisioningRequestId: req.id,
      status: 'succeeded',
      churchId: req.churchId,
    };
  }
  if (req.status !== 'failed' && req.status !== 'queued') {
    throw conflict('Provisioning is not retryable in its current status.');
  }
  if (req.status === 'failed') {
    await regRepo.updateProvisioning(db, req.id, {
      status: 'queued',
      errorMessage: null,
      updatedBy: ctx.actor.userAccountId,
    });
  }
  await writePlatformAudit(db, ctx, {
    action: 'platform.provisioning.retry',
    entityType: 'tenant_provisioning_request',
    entityId: req.id,
  });
  return { provisioningRequestId: req.id, status: 'queued' };
}

/** Public: first admin sets PIN and activates tenant. */
export async function acceptAdminInvite(body: AcceptAdminInviteBody) {
  const db = getDb();
  const tokenHash = hashToken(body.token);
  const req = await regRepo.findProvisioningByInviteTokenHash(db, tokenHash);
  if (!req || req.status !== 'succeeded') {
    throw notFound('Invite not found.');
  }
  if (
    !req.adminInviteExpiresAt ||
    req.adminInviteExpiresAt.getTime() < Date.now()
  ) {
    throw validationFailed([
      { field: 'token', code: 'expired', message: 'Invite link expired.' },
    ]);
  }
  if (!req.churchId || !req.adminUserAccountId) {
    throw conflict('Provisioning incomplete.');
  }

  const church = await regRepo.getChurchLifecycle(db, req.churchId);
  if (!church) throw notFound('Church not found.');

  const app = await regRepo.findApplicationById(db, req.applicationId);
  if (!app) throw notFound();

  const existingAuth = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.id, req.adminUserAccountId))
    .limit(1);

  if (!existingAuth[0]) {
    await provisionCredentialAccount(db, {
      userAccountId: req.adminUserAccountId,
      displayName: app.representativeName,
      email: app.email,
      phoneE164: app.phoneE164,
      pin: body.pin,
      twoFactorEnabled: true,
    });
  } else if (church.lifecycleStatus === 'active') {
    throw conflict('This invite was already used.');
  }

  if (church.lifecycleStatus === 'pending_activation') {
    await regRepo.updateChurchLifecycle(
      db,
      req.churchId,
      'active',
      req.adminUserAccountId,
    );
  }

  await regRepo.updateProvisioning(db, req.id, {
    adminInviteTokenHash: null,
    adminInviteExpiresAt: null,
  });
  await regRepo.insertRegistrationEvent(db, {
    applicationId: app.id,
    eventType: 'admin_activated',
    actorUserId: req.adminUserAccountId,
  });

  return {
    church: {
      id: church.id,
      name: church.name,
      slug: church.slug,
      lifecycleStatus: 'active' as const,
    },
    adminUserAccountId: req.adminUserAccountId,
    mfaRequired: true,
  };
}

export async function patchTenantLifecycle(
  ctx: PlatformCtx,
  churchId: string,
  body: PatchTenantLifecycleBody,
) {
  assertPlatformChurchesWrite(ctx);
  if (
    (body.lifecycleStatus === 'suspended' ||
      body.lifecycleStatus === 'closed') &&
    body.pin
  ) {
    const { confirmOperatorPin } = await import('./reauth-service');
    await confirmOperatorPin(ctx, { pin: body.pin });
  }
  const db = getDb();
  const church = await regRepo.getChurchLifecycle(db, churchId);
  if (!church) throw notFound();

  await regRepo.updateChurchLifecycle(
    db,
    churchId,
    body.lifecycleStatus,
    ctx.actor.userAccountId,
  );
  await writePlatformAudit(db, ctx, {
    action: 'platform.church.lifecycle',
    entityType: 'church',
    entityId: churchId,
    churchId,
    metadata: sanitizeAuditMetadata({
      from: church.lifecycleStatus,
      to: body.lifecycleStatus,
      reason: body.reason,
    }),
  });

  return {
    id: churchId,
    lifecycleStatus: body.lifecycleStatus,
  };
}
