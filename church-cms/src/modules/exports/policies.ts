import { can } from '@/modules/access-control/can';
import type { Ctx } from '@/platform/auth';
import { forbidden } from '@/platform/errors';
import type { ExportKind } from './constants';

export function assertCanRunExport(ctx: Ctx, kind: ExportKind): void {
  if (!can(ctx, 'exports:run')) throw forbidden();

  if (kind === 'people' && !can(ctx, 'people:read')) throw forbidden();
  if (
    kind === 'attendance' &&
    !can(ctx, 'attendance:read') &&
    !can(ctx, 'attendance:stats_leadership')
  ) {
    throw forbidden();
  }
  if (kind === 'finance' && !can(ctx, 'finance_reports:read')) throw forbidden();
}
