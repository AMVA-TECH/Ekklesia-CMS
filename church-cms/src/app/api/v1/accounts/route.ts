import { withApiHandler, parseJsonBody, jsonCreated, REQUEST_ID_HEADER } from '@/platform/http';
import { createAccountBodySchema, createAccount, listAccounts } from '@/modules/finance';

export const GET = withApiHandler(async (ctx) => {
  const result = await listAccounts(ctx);
  return Response.json(result, { headers: { [REQUEST_ID_HEADER]: ctx.requestId } });
});

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createAccountBodySchema);
  const account = await createAccount(ctx, body);
  return jsonCreated(account, ctx.requestId, `/api/v1/accounts/${account.id}`);
});
