import { withApiHandler, parseJsonBody, jsonCreated } from '@/platform/http';
import { createJournalBodySchema, createJournal } from '@/modules/finance';

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createJournalBodySchema);
  const journal = await createJournal(ctx, body);
  return jsonCreated(journal, ctx.requestId, `/api/v1/journals/${journal.id}`);
});
