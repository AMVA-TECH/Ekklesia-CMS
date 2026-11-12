# Testing and Quality Skill

## Purpose
Provide evidence that approved requirements work and that changes do not weaken existing behaviour.

## Test levels
- Unit: business rules and edge cases.
- Integration: database, API and external boundaries.
- Authorisation: permitted and forbidden actors/actions/records.
- End-to-end: critical user workflows.
- Regression: previously working behaviour.
- Operational: migration, backup/restore and deployment checks where relevant.

## Workflow
1. Derive tests from acceptance criteria.
2. Include normal, boundary, invalid, duplicate, concurrent and failure cases as relevant.
3. Test access denial, not only successful access.
4. Use synthetic data.
5. Run relevant checks and capture actual results.
6. Record defects, severity and residual risk.

Never weaken or delete tests merely to obtain a passing build.
