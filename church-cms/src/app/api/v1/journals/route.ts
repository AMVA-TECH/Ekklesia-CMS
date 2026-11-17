import {
  withApiHandler,
  parseJsonBody,
  parseQuery,
  jsonCreated,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  createJournalBodySchema,
  createJournal,
  listJournalsQuerySchema,
  listJournals,
} from '@/modules/finance';

export const GET = withApiHandler(async (ctx, request) => {
  const query = parseQuery(new URL(request.url), listJournalsQuerySchema);
  const result = await listJournals(ctx, query);
  return Response.json(result, { headers: { [REQUEST_ID_HEADER]: ctx.requestId } });
});

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createJournalBodySchema);
  const journal = await createJournal(ctx, body);
  return jsonCreated(journal, ctx.requestId, `/api/v1/journals/${journal.id}`);
});
