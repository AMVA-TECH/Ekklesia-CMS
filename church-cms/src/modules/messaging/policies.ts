import { can } from '@/modules/access-control/can';
import type { Ctx } from '@/platform/auth';
import { forbidden } from '@/platform/errors';

export function assertCanWriteTemplates(ctx: Ctx): void {
  if (!can(ctx, 'templates:write')) throw forbidden();
}
export function assertCanWriteAnnouncements(ctx: Ctx): void {
  if (!can(ctx, 'announcements:write')) throw forbidden();
}
export function assertCanPublishAnnouncements(ctx: Ctx): void {
  if (!can(ctx, 'announcements:publish')) throw forbidden();
}
export function assertCanManageOwnPreferences(ctx: Ctx): void {
  if (!can(ctx, 'preferences:self')) throw forbidden();
}

export function assertCanSendMessages(ctx: Ctx): void {
  if (!can(ctx, 'messages:send') && !can(ctx, 'messages:bulk_send')) {
    throw forbidden();
  }
}

export function assertCanBulkSend(ctx: Ctx): void {
  if (!can(ctx, 'messages:bulk_send')) throw forbidden();
}
