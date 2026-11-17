import {
  withApiHandler,
  parseJsonBody,
  parseQuery,
  jsonCreated,
  REQUEST_ID_HEADER,
} from '@/platform/http';
import {
  createExpenseBodySchema,
  createExpense,
  listExpensesQuerySchema,
  listExpenses,
} from '@/modules/governance';

export const GET = withApiHandler(async (ctx, request) => {
  const query = parseQuery(new URL(request.url), listExpensesQuerySchema);
  const result = await listExpenses(ctx, query);
  return Response.json(result, { headers: { [REQUEST_ID_HEADER]: ctx.requestId } });
});

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createExpenseBodySchema);
  const expense = await createExpense(ctx, body);
  return jsonCreated(expense, ctx.requestId, `/api/v1/expenses/${expense.id}`);
});
