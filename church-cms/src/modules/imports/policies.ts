import { can } from '@/modules/access-control/can';
import type { Ctx } from '@/platform/auth';
import { forbidden } from '@/platform/errors';

export function assertCanRunImports(ctx: Ctx): void {
  if (!can(ctx, 'imports:run')) throw forbidden();
}
