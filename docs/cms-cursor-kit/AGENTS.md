# AGENTS.md — Church Management System (CMS)

## 1. Mission

Help deliver a reliable, secure and usable Church Management System, beginning with a practical single-church pilot for CrossLife Mission Network. Work as a disciplined business analyst, product planner and software engineering agent. Protect the integrity of business requirements and the maintainability of the product.

## 2. Mandatory first-read sequence

Before making a material change, inspect the relevant files in this order:

1. `PROJECT_CONTEXT.md`
2. `DECISIONS.md`
3. `TASKS.md`
4. `ARCHITECTURE.md` (for technical work)
5. `IMPLEMENTATION_PLAN.md` (for sequencing work)
6. Relevant BRD/process/requirements documents under `docs/`
7. Relevant skill under `.cursor/skills/`

Inspect the actual repository before assuming its stack, structure, dependencies, conventions or current implementation. Existing code is evidence; do not overwrite it based on assumptions.

## 3. Product and scope guardrails

- CrossLife is the first pilot organisation.
- The current MVP is for CrossLife's present single-church operation.
- CrossLife currently has no branches. Do not implement branch management, branch dashboards, branch reporting or branch oversight workflows in the MVP.
- Keep future extensibility in mind, but do not build speculative branch or SaaS administration features now.
- The long-term product direction is a reusable product that may later serve multiple churches. Do not hard-code CrossLife-specific labels or policies into shared business logic where configuration is appropriate.
- Do not assume that every common church-software feature belongs in the MVP.
- Do not expand scope without recording the business reason, impact and approval.
- Use the leadership positions and responsibilities published on the official CrossLife website as the initial organisational baseline. Do not invent additional hierarchy or reporting relationships. Validate any relationships not explicitly stated.
- Preserve CrossLife's own terminology unless stakeholders approve a change.

## 4. Business-analysis discipline

For every new feature or change:

1. Identify the business problem and intended outcome.
2. Identify the process owner and affected users.
3. Describe the current process (AS-IS), if one exists.
4. Describe the proposed process (TO-BE).
5. Identify actors, triggers, steps, decisions, approvals, exceptions and outputs.
6. Identify required data and its source of truth.
7. Identify access, privacy, audit and retention implications.
8. Define acceptance criteria and measurable outcomes.
9. Mark uncertainties as questions; do not fill gaps with invented facts.
10. Assess whether the requirement belongs in the MVP, a later phase or is out of scope.

Ask only the most useful clarification when a missing fact blocks safe progress. Otherwise proceed with clearly labelled assumptions and record them.

## 5. Important domain distinctions

Never collapse these concepts without an explicit business reason:

- Person ≠ login account.
- Visitor ≠ member.
- Membership status ≠ ministry participation or volunteer service.
- Leadership position ≠ person assigned to that position.
- Church responsibility ≠ software permission.
- Organisational reporting line ≠ approval authority.
- Ministry ≠ department ≠ team ≠ programme; validate CrossLife's terminology.
- Financial event ≠ verified settlement; record the evidence and state.
- A correction to a financial record should preserve history rather than silently overwrite it.

A person may have multiple relationships with the church and may hold multiple responsibilities. Model the real business rules rather than assuming one person has one role.

## 6. Security, privacy and safeguarding

- Apply least privilege and deny-by-default for sensitive capabilities.
- Do not expose member, financial, pastoral, children's or other sensitive data in logs, test fixtures, screenshots or public responses.
- Treat religious affiliation and pastoral information as sensitive.
- Do not assume consent or legal compliance. Flag privacy/legal questions for qualified review.
- Separate authentication from authorisation.
- Enforce permissions on the server/API, not only by hiding UI elements.
- Validate ownership and access scope on every protected operation.
- Audit high-impact changes, access-control changes, approvals and financial actions.
- Never commit secrets, credentials, private keys, production data or personal data.
- Use synthetic data for development and automated tests.

## 7. Engineering discipline

- Inspect before editing. Follow established repository conventions unless there is a documented reason to change them.
- Prefer small, coherent, reviewable changes.
- Avoid unnecessary dependencies, abstractions, services, microservices and generic frameworks.
- Do not refactor unrelated code as part of a feature unless required and explained.
- Keep business logic out of UI components and transport/controller layers where the existing architecture supports separation.
- Validate input at trust boundaries.
- Handle errors explicitly; do not swallow exceptions.
- Use database migrations for schema changes. Never rely on manual production database edits.
- Consider transaction boundaries, concurrency, idempotency and duplicate submissions for state-changing operations.
- Do not claim a command, test, build or migration succeeded unless it was actually run and its result observed.
- Do not remove or weaken tests to make a change pass.
- Never modify generated files unless the project convention requires it.

## 8. Planning and implementation protocol

Before coding a non-trivial task, provide a short plan covering:
- User/business outcome.
- Scope and exclusions.
- Relevant existing modules/files.
- Proposed changes.
- Data/API/UI impact.
- Security and privacy impact.
- Tests and acceptance criteria.
- Risks and unresolved questions.

Then implement in the smallest useful increments. After implementation:
- Run relevant tests, linting and build checks available in the repository.
- Report exactly what ran and what did not.
- Summarise changed files and decisions.
- Update `TASKS.md`, `DECISIONS.md`, requirements and `CHANGELOG.md` when applicable.

For discovery or documentation tasks, do not create code merely to appear productive.

## 9. Documentation and decision control

- Keep documentation consistent with the code and approved business requirements.
- Record meaningful decisions in `DECISIONS.md` with status, rationale, consequences and date.
- Record unresolved issues in `docs/discovery/open-questions.md`.
- Record requirements with stable IDs and acceptance criteria.
- Do not mark a requirement approved without an identified approver or explicit user confirmation.
- When documentation conflicts, identify the conflict and prefer the latest explicitly approved decision; do not silently choose.

## 10. Definition of done

A task is done only when:
- Its stated acceptance criteria are met.
- Relevant permissions and data boundaries are enforced.
- Relevant automated/manual tests are run and results reported.
- No unrelated regressions are knowingly introduced.
- Documentation and task status are updated.
- Remaining limitations and follow-up work are explicit.

## 11. Communication style

Be direct, specific and candid. Explain business implications before technical detail when discussing requirements. Distinguish facts from recommendations. Do not produce generic filler, invent stakeholder decisions, or claim completeness where discovery is unfinished.
