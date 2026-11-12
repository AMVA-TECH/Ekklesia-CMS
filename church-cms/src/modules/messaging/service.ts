import type { Ctx } from '@/platform/auth';
import { getDb } from '@/platform/db/client';
import { writeAudit } from '@/platform/audit';
import { getEnv } from '@/platform/config';
import { conflict, forbidden, notFound, validationFailed } from '@/platform/errors';
import { getNotifyAdapter } from '@/platform/notify';
import { can } from '@/modules/access-control/can';
import {
  findPendingApprovalBySubject,
  insertApprovalRequest,
  recordApprovalDecision,
} from '@/modules/governance/repository';
import { getUnitById } from '@/modules/organisation/repository';
import { MESSAGE_JOB_RECIPIENT_CAP } from './constants';
import {
  toAnnouncementResponse,
  toDeliveryResponse,
  toMessageJobResponse,
  toPreferencesResponse,
  toTemplateResponse,
} from './mappers';
import {
  assertCanBulkSend,
  assertCanManageOwnPreferences,
  assertCanPublishAnnouncements,
  assertCanSendMessages,
  assertCanWriteAnnouncements,
  assertCanWriteTemplates,
} from './policies';
import type {
  CreateAnnouncementBody,
  CreateMessageJobBody,
  CreateTemplateBody,
  UpdatePreferencesBody,
} from './schemas';
import * as repo from './repository';

async function announcementResponse(ctx: Ctx, id: string) {
  const db = getDb();
  const row = await repo.getAnnouncement(db, ctx, id);
  if (!row) throw notFound();
  const audiences = await repo.listAudiencesForAnnouncement(db, id);
  return toAnnouncementResponse(row, audiences);
}

function isChurchWideAudience(
  audiences: { audienceType: string }[],
): boolean {
  return audiences.some((a) => a.audienceType === 'all_members');
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  );
}

export async function listMessageTemplates(ctx: Ctx) {
  assertCanWriteTemplates(ctx);
  return { data: (await repo.listTemplates(getDb(), ctx)).map(toTemplateResponse) };
}
export async function createMessageTemplate(ctx: Ctx, body: CreateTemplateBody) {
  assertCanWriteTemplates(ctx);
  try {
    const id = await repo.insertTemplate(getDb(), ctx, body);
    await writeAudit(getDb(), ctx, {
      action: 'messaging.template.created',
      entityType: 'message_template',
      entityId: id,
    });
    const row = await repo.getTemplate(getDb(), ctx, id);
    if (!row) throw notFound();
    return toTemplateResponse(row);
  } catch (e) {
    if (isUniqueViolation(e)) {
      throw conflict('Template already exists for this code/channel/locale.');
    }
    throw e;
  }
}

export async function listAnnouncements(ctx: Ctx) {
  const db = getDb();
  const canWrite = can(ctx, 'announcements:write');
  let rows;
  if (canWrite) {
    rows = await repo.listAnnouncements(db, ctx, false);
  } else if (ctx.actor.personId) {
    rows = await repo.listAnnouncementsForMember(db, ctx, ctx.actor.personId);
  } else {
    rows = await repo.listAnnouncements(db, ctx, true);
  }
  const audiences = await repo.listAudiencesForAnnouncements(
    db,
    rows.map((r) => r.id),
  );
  const byAnnouncement = new Map<string, typeof audiences>();
  for (const a of audiences) {
    const list = byAnnouncement.get(a.announcementId) ?? [];
    list.push(a);
    byAnnouncement.set(a.announcementId, list);
  }
  return {
    data: rows.map((row) =>
      toAnnouncementResponse(row, byAnnouncement.get(row.id) ?? []),
    ),
  };
}
export async function createAnnouncement(ctx: Ctx, body: CreateAnnouncementBody) {
  assertCanWriteAnnouncements(ctx);
  const db = getDb();
  const audiences =
    body.audiences && body.audiences.length > 0
      ? body.audiences
      : [{ audienceType: 'all_members' as const }];
  for (const a of audiences) {
    if (a.audienceType === 'organisational_unit') {
      const unit = await getUnitById(db, ctx, a.organisationalUnitId!);
      if (!unit) throw notFound();
    }
  }
  const id = await repo.insertAnnouncement(db, ctx, { ...body, audiences });
  await writeAudit(db, ctx, {
    action: 'messaging.announcement.created',
    entityType: 'announcement',
    entityId: id,
    metadata: {
      audienceTypes: audiences.map((a) => a.audienceType),
    },
  });
  return announcementResponse(ctx, id);
}

/** Church-wide drafts enter the approvals inbox (DEC-032). */
export async function submitAnnouncement(ctx: Ctx, id: string) {
  assertCanWriteAnnouncements(ctx);
  const db = getDb();
  const row = await repo.getAnnouncement(db, ctx, id);
  if (!row) throw notFound();
  if (row.status !== 'draft' && row.status !== 'rejected') {
    throw conflict('Only draft or rejected announcements can be submitted for approval.');
  }
  const audiences = await repo.listAudiencesForAnnouncement(db, id);
  if (!isChurchWideAudience(audiences)) {
    throw conflict(
      'Unit-scoped announcements can be published directly; submit is for church-wide targeting.',
    );
  }
  const approvalId = await insertApprovalRequest(db, ctx, 'announcement', id);
  await repo.setAnnouncementStatus(db, ctx, id, 'pending_approval');
  await writeAudit(db, ctx, {
    action: 'messaging.announcement.submitted',
    entityType: 'announcement',
    entityId: id,
    metadata: { approvalRequestId: approvalId },
  });
  return {
    announcement: await announcementResponse(ctx, id),
    approvalRequestId: approvalId,
  };
}

/**
 * Unit-scoped: publish from draft with announcements:publish.
 * Church-wide: publish_direct from draft if actor has announcements:publish;
 * otherwise submit for dual-control approval (DEC-032).
 */
export async function publishAnnouncement(ctx: Ctx, id: string) {
  assertCanPublishAnnouncements(ctx);
  const db = getDb();
  const row = await repo.getAnnouncement(db, ctx, id);
  if (!row) throw notFound();
  if (row.status === 'published') throw conflict('Announcement is already published.');
  if (row.status === 'archived') {
    throw conflict('Archived announcements cannot be published.');
  }
  if (row.status === 'rejected') {
    throw conflict('Rejected announcements must be re-submitted or re-drafted.');
  }
  if (row.status === 'pending_approval') {
    throw conflict(
      'Announcement is awaiting approval — decide via /approval-requests.',
    );
  }
  const audiences = await repo.listAudiencesForAnnouncement(db, id);
  const churchWide = isChurchWideAudience(audiences);
  await repo.publishAnnouncement(db, ctx, id);
  await writeAudit(db, ctx, {
    action: churchWide
      ? 'messaging.announcement.publish_direct'
      : 'messaging.announcement.published',
    entityType: 'announcement',
    entityId: id,
    metadata: { churchWide },
  });
  return announcementResponse(ctx, id);
}

/** Called from governance decideApproval for subjectType=announcement. */
export async function applyAnnouncementApprovalDecision(
  ctx: Ctx,
  announcementId: string,
  action: 'approve' | 'reject',
) {
  assertCanPublishAnnouncements(ctx);
  const db = getDb();
  const row = await repo.getAnnouncement(db, ctx, announcementId);
  if (!row) throw notFound();
  if (row.status !== 'pending_approval') {
    throw conflict('Announcement is not awaiting approval.');
  }
  if (action === 'approve') {
    await repo.publishAnnouncement(db, ctx, announcementId);
    await writeAudit(db, ctx, {
      action: 'messaging.announcement.published',
      entityType: 'announcement',
      entityId: announcementId,
      metadata: { via: 'approval' },
    });
  } else {
    await repo.setAnnouncementStatus(db, ctx, announcementId, 'rejected', {
      publishedAt: null,
    });
    await writeAudit(db, ctx, {
      action: 'messaging.announcement.rejected',
      entityType: 'announcement',
      entityId: announcementId,
      metadata: { via: 'approval' },
    });
  }
  return announcementResponse(ctx, announcementId);
}

/**
 * API-map path for rejecting a church-wide announcement awaiting approval.
 * Enforces dual-control when a pending approval request exists.
 */
export async function rejectAnnouncement(
  ctx: Ctx,
  id: string,
  note?: string,
) {
  assertCanPublishAnnouncements(ctx);
  const db = getDb();
  const row = await repo.getAnnouncement(db, ctx, id);
  if (!row) throw notFound();
  if (row.status !== 'pending_approval') {
    throw conflict('Only pending_approval announcements can be rejected here.');
  }

  const approval = await findPendingApprovalBySubject(db, ctx, 'announcement', id);
  if (approval && approval.requestedByUserId === ctx.actor.userAccountId) {
    throw forbidden('You cannot decide on a request you submitted.');
  }
  if (approval) {
    await recordApprovalDecision(db, ctx, approval.id, 'reject', note);
  }

  await repo.setAnnouncementStatus(db, ctx, id, 'rejected', { publishedAt: null });
  await writeAudit(db, ctx, {
    action: 'messaging.announcement.rejected',
    entityType: 'announcement',
    entityId: id,
    metadata: {
      via: 'announcements.reject',
      approvalRequestId: approval?.id ?? null,
      note: note ?? null,
    },
  });
  return announcementResponse(ctx, id);
}

export async function getMyPreferences(ctx: Ctx) {
  assertCanManageOwnPreferences(ctx);
  const personId = ctx.actor.personId;
  if (!personId) {
    throw validationFailed([
      { field: 'personId', code: 'required', message: 'Session personId is required' },
    ]);
  }
  const row = await repo.getPreferences(getDb(), ctx, personId);
  if (!row) {
    return { personId, smsOptIn: true, whatsappOptIn: true, emailOptIn: true };
  }
  return toPreferencesResponse(row);
}
export async function updateMyPreferences(ctx: Ctx, body: UpdatePreferencesBody) {
  assertCanManageOwnPreferences(ctx);
  const personId = ctx.actor.personId;
  if (!personId) {
    throw validationFailed([
      { field: 'personId', code: 'required', message: 'Session personId is required' },
    ]);
  }
  const db = getDb();
  await repo.upsertPreferences(db, ctx, personId, body);
  await writeAudit(db, ctx, {
    action: 'messaging.preferences.updated',
    entityType: 'communication_preferences',
    entityId: personId,
  });
  return getMyPreferences(ctx);
}

/**
 * Leadership text blast — custom body (or template/announcement), consent-aware queue.
 * Provider outbound send is deferred; deliveries stay `pending` for a worker.
 */
export async function createMessageJob(ctx: Ctx, body: CreateMessageJobBody) {
  assertCanBulkSend(ctx);
  const db = getDb();

  if (body.organisationalUnitId) {
    const unit = await getUnitById(db, ctx, body.organisationalUnitId);
    if (!unit) throw notFound();
  }

  let resolvedBody = body.body?.trim() ?? '';
  let title = body.title ?? null;

  if (body.templateId) {
    const template = await repo.getTemplate(db, ctx, body.templateId);
    if (!template) throw notFound();
    if (template.channel !== body.channel) {
      throw validationFailed([
        {
          field: 'templateId',
          code: 'channel_mismatch',
          message: 'Template channel must match job channel',
        },
      ]);
    }
    if (!resolvedBody) resolvedBody = template.body;
  }

  if (body.announcementId) {
    const announcement = await repo.getAnnouncement(db, ctx, body.announcementId);
    if (!announcement) throw notFound();
    if (announcement.status !== 'published') {
      throw validationFailed([
        {
          field: 'announcementId',
          code: 'not_published',
          message: 'Only published announcements can be blasted',
        },
      ]);
    }
    if (!resolvedBody) resolvedBody = announcement.body;
    if (!title) title = announcement.title;
  }

  if (!resolvedBody) {
    throw validationFailed([
      {
        field: 'body',
        code: 'required',
        message: 'Blast body is required',
      },
    ]);
  }

  const candidates = await repo.listBlastCandidates(
    db,
    ctx,
    body.audienceType,
    body.organisationalUnitId,
    MESSAGE_JOB_RECIPIENT_CAP,
  );

  let skippedNoContact = 0;
  let skippedOptOut = 0;
  const recipients: { personId: string; toAddress: string }[] = [];

  for (const c of candidates) {
    const optedIn =
      body.channel === 'sms'
        ? c.smsOptIn !== false
        : c.whatsappOptIn !== false;
    if (!optedIn) {
      skippedOptOut += 1;
      continue;
    }
    if (!c.toAddress) {
      skippedNoContact += 1;
      continue;
    }
    recipients.push({ personId: c.personId, toAddress: c.toAddress });
  }

  const jobId = await repo.insertMessageJob(db, ctx, {
    channel: body.channel,
    title,
    body: resolvedBody,
    audienceType: body.audienceType,
    organisationalUnitId: body.organisationalUnitId,
    templateId: body.templateId,
    announcementId: body.announcementId,
    scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
  });
  await repo.insertDeliveries(db, ctx, jobId, body.channel, recipients);

  await writeAudit(db, ctx, {
    action: 'messaging.blast.queued',
    entityType: 'message_job',
    entityId: jobId,
    metadata: {
      channel: body.channel,
      audienceType: body.audienceType,
      recipientCount: recipients.length,
      skippedNoContact,
      skippedOptOut,
      // counts only — no phone list
    },
  });

  const row = await repo.getMessageJob(db, ctx, jobId);
  if (!row) throw notFound();

  if (getEnv().NOTIFY_AUTO_DISPATCH === '1' && recipients.length > 0) {
    return dispatchMessageJob(ctx, jobId);
  }

  return toMessageJobResponse(row, {
    recipientCount: recipients.length,
    skippedNoContact,
    skippedOptOut,
  });
}

/**
 * Push pending deliveries through the configured notify adapter (stub or HTTP).
 * Does not block the original create request unless NOTIFY_AUTO_DISPATCH=1.
 */
export async function dispatchMessageJob(ctx: Ctx, jobId: string) {
  assertCanBulkSend(ctx);
  const db = getDb();
  const pending = await repo.listPendingDeliveries(db, ctx, jobId);
  if (!pending) throw notFound();
  const { job, rows } = pending;

  if (!job.body) {
    throw validationFailed([
      { field: 'body', code: 'required', message: 'Job has no body to send' },
    ]);
  }
  if (job.channel !== 'sms' && job.channel !== 'whatsapp') {
    throw validationFailed([
      {
        field: 'channel',
        code: 'unsupported',
        message: 'Only sms and whatsapp can be dispatched',
      },
    ]);
  }

  await repo.setJobStatus(db, ctx, jobId, 'sending', { started: true });
  const adapter = getNotifyAdapter();
  let sent = 0;
  let failed = 0;

  for (const delivery of rows) {
    const result = await adapter.send({
      channel: job.channel,
      to: delivery.toAddress,
      body: job.body,
      idempotencyKey: delivery.id,
    });
    if (result.ok) {
      await repo.markDeliverySent(db, delivery.id, result.providerRef);
      sent += 1;
    } else {
      await repo.markDeliveryFailed(db, delivery.id, result.error);
      failed += 1;
    }
  }

  const statuses = await repo.countDeliveryStatuses(db, jobId);
  const stillPending = statuses.pending ?? 0;
  const finalStatus =
    stillPending > 0 ? 'queued' : failed > 0 && sent === 0 ? 'failed' : 'completed';
  await repo.setJobStatus(db, ctx, jobId, finalStatus, { completed: true });

  await writeAudit(db, ctx, {
    action: 'messaging.blast.dispatched',
    entityType: 'message_job',
    entityId: jobId,
    metadata: {
      provider: adapter.name,
      sent,
      failed,
      stillPending,
      // counts only
    },
  });

  const updated = await repo.getMessageJob(db, ctx, jobId);
  if (!updated) throw notFound();
  return toMessageJobResponse(updated, {
    recipientCount: await repo.countDeliveriesForJob(db, jobId),
    skippedNoContact: 0,
    skippedOptOut: 0,
  });
}

/** Provider webhook: update a delivery by providerRef. */
export async function applyProviderDeliveryUpdate(input: {
  providerRef: string;
  status: 'delivered' | 'failed';
  error?: string;
}) {
  const db = getDb();
  const row = await repo.markDeliveryStatusByProviderRef(
    db,
    input.providerRef,
    input.status,
    input.error,
  );
  if (!row) throw notFound();
  return { id: row.id, jobId: row.jobId, status: input.status };
}

/**
 * Briq Karibu webhook envelope (SMS / WhatsApp delivery events).
 * @see https://docs.briq.tz/guides/webhooks
 */
export async function applyBriqWebhookEvent(input: {
  event: string;
  jobId?: string;
  messageId?: string;
  error?: string;
}) {
  const db = getDb();
  const row = await repo.findDeliveryByBriqRefs(db, {
    jobId: input.jobId,
    messageId: input.messageId,
  });
  if (!row) throw notFound();

  // Promote job_id → message_id so later DLR events resolve.
  if (input.messageId && row.providerRef?.startsWith('briq:job:')) {
    await repo.updateDeliveryProviderRef(db, row.id, `briq:msg:${input.messageId}`);
  }

  if (input.event === 'sms.sent' || input.event === 'whatsapp.sent') {
    await repo.markDeliveryStatusByProviderRef(
      db,
      input.messageId ? `briq:msg:${input.messageId}` : row.providerRef!,
      'sent',
    );
    return { id: row.id, jobId: row.jobId, status: 'sent' as const };
  }

  if (
    input.event === 'sms.delivered' ||
    input.event === 'whatsapp.delivered' ||
    input.event === 'whatsapp.read'
  ) {
    const ref = input.messageId ? `briq:msg:${input.messageId}` : row.providerRef!;
    await repo.markDeliveryStatusByProviderRef(db, ref, 'delivered');
    return { id: row.id, jobId: row.jobId, status: 'delivered' as const };
  }

  if (
    input.event === 'sms.failed' ||
    input.event === 'sms.expired' ||
    input.event === 'whatsapp.failed'
  ) {
    const ref = input.messageId ? `briq:msg:${input.messageId}` : row.providerRef!;
    await repo.markDeliveryStatusByProviderRef(
      db,
      ref,
      'failed',
      input.error ?? input.event,
    );
    return { id: row.id, jobId: row.jobId, status: 'failed' as const };
  }

  // Unknown event — acknowledge without status change
  return { id: row.id, jobId: row.jobId, status: row.status };
}

export async function getMessageJob(ctx: Ctx, id: string) {
  assertCanSendMessages(ctx);
  const db = getDb();
  const row = await repo.getMessageJob(db, ctx, id);
  if (!row) throw notFound();
  const recipientCount = await repo.countDeliveriesForJob(db, id);
  return toMessageJobResponse(row, {
    recipientCount,
    skippedNoContact: 0,
    skippedOptOut: 0,
  });
}

export async function listMessageJobs(ctx: Ctx) {
  assertCanSendMessages(ctx);
  const rows = await repo.listMessageJobs(getDb(), ctx);
  return {
    data: await Promise.all(
      rows.map(async (row) =>
        toMessageJobResponse(row, {
          recipientCount: await repo.countDeliveriesForJob(getDb(), row.id),
          skippedNoContact: 0,
          skippedOptOut: 0,
        }),
      ),
    ),
  };
}

export async function listMessageJobDeliveries(ctx: Ctx, jobId: string) {
  assertCanSendMessages(ctx);
  const rows = await repo.listDeliveriesForJob(getDb(), ctx, jobId);
  if (!rows) throw notFound();
  return { data: rows.map(toDeliveryResponse) };
}
