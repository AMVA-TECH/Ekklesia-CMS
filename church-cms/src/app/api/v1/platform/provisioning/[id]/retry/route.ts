import { after } from 'next/server';

import {
  withPlatformApiHandler,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  retryTenantProvisioning,
  runTenantProvisioning,
} from '@/modules/platform-ops';
import { notFound } from '@/platform/errors';

export const POST = withPlatformApiHandler(async (ctx, _request, routeCtx) => {
  const params = await routeCtx?.params;
  const id = params?.id;
  if (!id) throw notFound();
  const result = await retryTenantProvisioning(ctx, id);

  if (result.status === 'queued') {
    const provisioningRequestId = result.provisioningRequestId;
    after(async () => {
      try {
        await runTenantProvisioning(provisioningRequestId);
      } catch (error) {
        console.error(
          '[platform] provisioning retry failed',
          provisioningRequestId,
          error instanceof Error ? error.message : error,
        );
      }
    });
  }

  return Response.json(result, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
