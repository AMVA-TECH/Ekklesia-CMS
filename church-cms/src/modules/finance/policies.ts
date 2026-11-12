import { can } from '@/modules/access-control/can';
import type { Ctx } from '@/platform/auth';
import { forbidden } from '@/platform/errors';

export function assertCanReadFunds(ctx: Ctx): void {
  if (!can(ctx, 'funds:read')) throw forbidden();
}
export function assertCanWriteFunds(ctx: Ctx): void {
  if (!can(ctx, 'funds:write')) throw forbidden();
}
export function assertCanReadAccounts(ctx: Ctx): void {
  if (!can(ctx, 'accounts:read')) throw forbidden();
}
export function assertCanWriteAccounts(ctx: Ctx): void {
  if (!can(ctx, 'accounts:write')) throw forbidden();
}
export function assertCanWritePeriods(ctx: Ctx): void {
  if (!can(ctx, 'periods:write')) throw forbidden();
}
export function assertCanWriteOfferings(ctx: Ctx): void {
  if (!can(ctx, 'offerings:write')) throw forbidden();
}
export function assertCanReadPledges(ctx: Ctx): void {
  if (!can(ctx, 'pledges:read')) throw forbidden();
}
export function assertCanWritePledges(ctx: Ctx): void {
  if (!can(ctx, 'pledges:write')) throw forbidden();
}
export function assertCanFollowUpPledges(ctx: Ctx): void {
  if (!can(ctx, 'pledges:follow_up')) throw forbidden();
}
export function assertCanReadJournals(ctx: Ctx): void {
  if (!can(ctx, 'journals:read')) throw forbidden();
}
export function assertCanDraftJournals(ctx: Ctx): void {
  if (!can(ctx, 'journals:draft')) throw forbidden();
}
export function assertCanPostJournals(ctx: Ctx): void {
  if (!can(ctx, 'journals:post')) throw forbidden();
}
export function assertCanReverseJournals(ctx: Ctx): void {
  if (!can(ctx, 'journals:reverse')) throw forbidden();
}
export function assertCanReadProjects(ctx: Ctx): void {
  if (!can(ctx, 'projects:read') && !can(ctx, 'projects:write')) throw forbidden();
}
export function assertCanWriteProjects(ctx: Ctx): void {
  if (!can(ctx, 'projects:write')) throw forbidden();
}
export function assertCanAssignProjects(ctx: Ctx): void {
  if (!can(ctx, 'projects:assign') && !can(ctx, 'projects:write')) throw forbidden();
}
export function assertCanExpressProjectInterest(ctx: Ctx): void {
  if (!can(ctx, 'projects:interest') && !can(ctx, 'projects:read')) throw forbidden();
}
