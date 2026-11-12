# Backend Development Skill

## Workflow
1. Read project rules and inspect current backend conventions.
2. Link the task to approved requirements and acceptance criteria.
3. Define API/use-case behaviour, validation and authorisation.
4. Implement business logic in the established application/domain layer.
5. Use transactions for atomic state changes.
6. Consider retries, duplicate requests, concurrency and idempotency.
7. Add unit and integration tests, including forbidden access cases.
8. Update API and developer documentation.

## Rules
Do not trust client-supplied identity, role, ownership or scope. Avoid leaking internal exceptions. Keep controllers/handlers thin. Do not add dependencies without justification. Do not claim endpoint behaviour that has not been tested.
