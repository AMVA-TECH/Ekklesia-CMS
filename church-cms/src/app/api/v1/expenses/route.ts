import { withApiHandler, parseJsonBody, jsonCreated } from '@/platform/http';
import { createExpenseBodySchema, createExpense } from '@/modules/governance';

export const POST = withApiHandler(async (ctx, request) => {
  const body = await parseJsonBody(request, createExpenseBodySchema);
  const expense = await createExpense(ctx, body);
  return jsonCreated(expense, ctx.requestId, `/api/v1/expenses/${expense.id}`);
});
