# System Architecture Skill

## Purpose
Recommend the simplest architecture that satisfies validated requirements and the actual repository constraints.

## Workflow
1. Inspect repository, stack, deployment and existing patterns.
2. Confirm functional and quality requirements.
3. Identify boundaries, actors, integrations, trust boundaries and data flows.
4. Compare options and trade-offs.
5. Recommend a proportionate design.
6. Record material decisions as ADRs.
7. Define operational, security, migration and testing implications.

## Guardrails
A modular monolith is the default recommendation, not an immutable rule. Do not introduce microservices or distributed infrastructure without a demonstrated need. Do not implement multi-tenancy or branch management prematurely. Keep domain boundaries clear without building speculative frameworks.

## Architecture decision record
Context; decision drivers; options; decision; consequences; status; date; related requirements.
