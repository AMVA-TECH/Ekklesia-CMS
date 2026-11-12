import {
  withApiHandler,
  parseJsonBody,
  parseQuery,
  jsonCreated,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  createMembershipApplicationBodySchema,
  listMembershipApplicationsQuerySchema,
  createMembershipApplication,
  listMembershipApplications,
} from '@/modules/membership';

export const GET = withApiHandler(async (ctx, request) => {
  const query = parseQuery(
    new URL(request.url),
    listMembershipApplicationsQuerySchema,
  );
  const result = await listMembershipApplications(ctx, query);
  return Response.json(result, { headers: { [REQUEST_ID_HEADER]: ctx.requestId } });
});

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createMembershipApplicationBodySchema);
  const application = await createMembershipApplication(ctx, body);
  return jsonCreated(
    application,
    ctx.requestId,
    `/api/v1/membership-applications/${application.id}`,
  );
});
