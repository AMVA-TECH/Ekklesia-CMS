import { after } from 'next/server';

import {
  withPlatformApiHandler,
  parseJsonBody,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  decideApplicationBodySchema,
  decideChurchApplication,
  runTenantProvisioning,
} from '@/modules/platform-ops';
import { notFound } from '@/platform/errors';

export const POST = withPlatformApiHandler(async (ctx, request, routeCtx) => {
  const params = await routeCtx?.params;
  const id = params?.id;
  if (!id) throw notFound();
  const body = await parseJsonBody(request, decideApplicationBodySchema);
  const result = await decideChurchApplication(ctx, id, body);

  if (result.provisioningRequestId) {
    const provisioningRequestId = result.provisioningRequestId;
    after(async () => {
      try {
        await runTenantProvisioning(provisioningRequestId);
      } catch (error) {
        console.error(
          '[platform] provisioning after approve failed',
          provisioningRequestId,
          error instanceof Error ? error.message : error,
        );
      }
    });
  }

  return Response.json(result.application, {
    headers: { [REQUEST_ID_HEADER]: ctx.requestId },
  });
});
