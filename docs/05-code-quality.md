# 05 — Code Quality Standards (Google-based)

**Status:** Accepted. **Read with:** `AGENTS.md`, `06-git-discipline.md`.
**Basis:** Google TypeScript Style Guide, Google Engineering Practices (code review, small changes, change descriptions) and Google testing guidance. Reviewed against the published pages on 2026-11-07. This document **paraphrases and adapts** them for our project; Google's pages stay the authority (sources in section 12). Where we deliberately differ, section 2 says so.

---

## 1. Standards, and who wins

Order of precedence when rules conflict:

1. **This repository's documents** (`AGENTS.md`, `docs/*`), including our listed deviations (section 2).
2. **Google TypeScript Style Guide** — language, naming, types, comments.
3. **Google Engineering Practices** — what a good change and a good review look like.
4. **Google testing guidance** — how we design tests.
5. **React's own rules and Meta-style component conventions** — pure components, rules of hooks.
6. **Prettier** (formatting) and **ESLint** (enforcement). If a tool can check a rule, the tool checks it.

Google's own tie-breakers, which we adopt:
- **Facts and data beat opinions and personal taste.**
- **On style, the style guide is the authority.** A style point not in the guide is taste: follow the surrounding code; if there is none, accept the author's choice.
- **Design is almost never "just taste."** Judge it by software-design principles. If several approaches are equally valid, accept the author's.
- If no rule applies, **be consistent with the existing codebase**, unless that would make code health worse.
- Style guide goals: avoid patterns known to cause problems; pick **one** form when two are equivalent (so we do not argue in reviews); otherwise let the person closest to the code decide.

## 2. Our deliberate deviations from Google's TypeScript guide

| Topic | Google | Us | Why |
| --- | --- | --- | --- |
| File names | `snake_case` | **`kebab-case`** | Next.js/React ecosystem convention. |
| Default exports | Never | Never, **except** files Next.js requires them in (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, config files). Route handlers use named `GET`/`POST` exports. | Framework requirement. |
| Object shapes | `interface`, not `type` literals | Same: `interface` for object shapes. **Exception:** types derived from Zod (`z.infer<…>`) are `type` aliases. | Single source of truth in schemas. |
| Enums | Plain `enum` allowed, `const enum` banned | Prefer **string-literal unions / `as const` objects** (they serialise cleanly to JSON and the database). If an `enum` is used, never `const enum`. | API and DB friendliness. |
| Relative imports | Prefer relative inside a project | Relative inside a module; **`@/` alias (rooted at `src/`)** across top-level folders. Avoid long `../../../` chains. | Readability with our layer layout. |
| `null` vs `undefined` | No general rule | **Convention:** nullable DB values are `null` in domain objects and DTOs; omitted optional request fields are `undefined`. Never mix them for the same field. | Consistency. |
| Quotes / semicolons | Single quotes; always semicolons | Same — enforced by Prettier (`singleQuote: true`, `semi: true`). The scaffold's default formatting is changed in its own `style:` commit. | Adopt Google. |
| `@ts-expect-error` | Banned (like `@ts-ignore`), tolerated rarely in tests | Banned in production code. In tests only with a written reason. | Adopt Google. |
| Classes | Allowed, with rules | Prefer plain functions and modules; use a class only when it clearly helps. If used, follow section 3.6. | Simplicity; easier extraction. |
| Decorators | Do not define new ones; framework ones allowed | None now. A future NestJS backend may use its framework decorators. | Matches `07-backend-extraction.md`. |

## 3. Google TypeScript rules we follow (the agent must apply all)

### 3.1 Files and modules
- UTF-8. Order in a file: file comment (if any) → imports → implementation, one blank line between parts.
- **Named exports only** (see deviation above). Default exports give no canonical name and make renames and imports error-prone.
- **Export only what other modules use.** Keep the public surface small (this is also our module rule).
- **No `export let`.** Mutable exports confuse readers; use a getter function if mutation is truly needed.
- **No container classes** full of statics just to create a namespace. Export plain constants and functions.
- **No `namespace`, no `require`, no `/// <reference>`.** ES module imports only.
- Use `import type` / `export type` when only a type is involved.
- Prefer named imports for a few well-named symbols; namespace imports (`import * as x`) for many symbols from a large API.
- Do not use `import('./x').Foo` in type positions; use `import type`.

### 3.2 Variables, arrays, objects
- **`const` by default, `let` when reassigned, never `var`.** Do not use a variable before it is declared.
- One variable per declaration.
- Use literals (`[]`, `{}`), not `Array()`/`Object()` constructors. No non-numeric properties on arrays.
- Iterate arrays with `for…of`. Never use unfiltered `for…in`; prefer `Object.keys/values/entries`.
- Be careful spreading class instances or arrays into objects. Object-destructured parameters stay simple: one level, no computed keys; defaults on the left side.
- Prefer `Map` / `Set` over objects used as dictionaries; if an index signature is needed, give the key a meaningful label (`{[userName: string]: number}`).

### 3.3 Functions
- **Named functions: `function` declarations.** Callbacks and nested helpers: arrow functions. Do not use `function` expressions (except generators or deliberate `this` rebinding).
- Use a concise arrow body only when the return value is actually used; otherwise use a block body (prevents leaking a return value).
- **Do not pass a named function directly as a callback** unless its signature is stable (`['1','2'].map(parseInt)` style bugs). Wrap it: `(n) => format(n)`.
- Default parameter values must have **no side effects** and stay simple. Use rest parameters, never `arguments`.
- Keep functions small and focused. Past **~40 lines**, ask whether to split. Warning signs: deep nesting, several blocks that each need a comment, different error handling in different places.
- Avoid `this` outside classes; no arrow-function properties on classes except for stable event handlers.

### 3.4 Strings, numbers, coercion
- Single quotes; template literals for anything beyond simple concatenation; no line-continuation backslashes.
- **Parse numbers with `Number(x)`**, then check the result (`Number.isFinite`/`NaN`). Do **not** use unary `+x` or `parseFloat`; `parseInt` only with an explicit radix after validating the string. (Important for amounts, phone fragments, query params.)
- `String(x)`, `Boolean(x)` (no `new`) are fine. Do not coerce enum values to booleans; compare explicitly.
- Do not write `if (!!x)`; conditions already coerce.

### 3.5 Control flow and errors
- **Always use braces** (a one-line `if` may omit them). Always `===`/`!==`; the only exception is `== null` to test null-or-undefined.
- Avoid assignment inside conditions; if intentional, double-parenthesise.
- Every `switch` has a `default` (last) and no fall-through of non-empty cases. For unions, make the `default` an exhaustiveness check.
- **Throw only `Error` (or subclasses), using `new`.** Never throw strings or plain objects; the same for `Promise.reject`. Our domain errors extend `AppError`.
- When rethrowing, pass **`{ cause: e }`** to keep the chain; the cause must be an Error.
- In `catch (e: unknown)`, assume an `Error`. Do not defensively handle other types without a comment naming the API that misbehaves.
- **No empty `catch`.** If doing nothing is correct, say why in a comment.
- **Keep `try` blocks small:** only the lines that can throw.
- Prefer throwing exceptions over ad-hoc error-return shapes, except where our API layer converts errors into problem responses.

### 3.6 Classes (only when used)
- No `#private` fields; use `private`/`protected`. Never write `public` except for parameter properties that need it.
- Mark never-reassigned properties `readonly`. Use parameter properties instead of boilerplate assignments.
- Initialise fields where declared when they do not depend on constructor arguments.
- Do not keep constructor-only inputs as fields.
- Getters must be pure (no visible side effects). No pass-through accessors; make the field public/readonly instead.
- Constructors are always called with parentheses. No empty or delegating constructors.
- Avoid static-heavy designs and `this` in static methods; prefer module-level functions over private static methods.
- Do not touch `prototype`s; never modify built-in objects.

### 3.7 Disallowed features
Wrapper objects (`new String/Number/Boolean`) · relying on automatic semicolon insertion · `const enum` · `debugger` in committed code · `with` · `eval` / `Function(string)` · non-standard or not-yet-standardised language/web features · modifying built-ins or adding globals unless a third-party API forces it.

### 3.8 Naming
- Identifiers are descriptive to a newcomer. **No abbreviations that delete letters** (`cstmrId`), no ambiguous ones, no Hungarian notation. Very short names are fine only in tiny scopes (about 10 lines or less).
- **No type information in names:** no `IPerson` / `PersonInterface`; no leading/trailing underscores for "private"; no `opt_` prefixes. Name an interface after *why it exists* (`TodoItemStorage`), not that it is an interface.
- Treat acronyms as words: `loadHttpUrl`, `customerId` (not `loadHTTPURL`, `customerID`).
- Casing: `UpperCamelCase` for classes, interfaces, types, enums, type parameters, React components; `lowerCamelCase` for variables, functions, methods, properties, parameters; `CONSTANT_CASE` for true module-level constants (including enum values). A value created more than once at run time (e.g. a local in a function) is never `CONSTANT_CASE`.
- A leading `_` is only for a required but unused parameter/variable; never a suffix. Omit trailing unused parameters.
- Test names may use `_` structure (`createPerson_whenPhoneExists_throwsConflict`) or sentence style; pick one per project (we use **sentence style**, see 7).

### 3.9 Types
- Let the compiler infer **trivial** types (`const count = 0`). Annotate where it helps readers, and on exported functions (our project policy: explicit return types for exports).
- **No `any`.** Use a specific type, a generic, or **`unknown` and narrow**. If `any` is truly needed (e.g. a partial test mock), suppress the lint warning with a comment saying why.
- **Avoid `as` and `!`.** Prefer a runtime check (`instanceof`, `if (x)`). If kept, add a comment saying why it is safe. Use `as` syntax (not `<T>x`). Never use `as` to type an object literal; annotate it (`const p: Person = {…}`) so renamed fields are caught.
- Declare the type where you create structural values; use `interface` for object shapes.
- **No nullable type aliases** (`type X = A | undefined`). Add `| null`/`| undefined` at the use site and deal with absent values close to where they arise.
- `T[]`/`readonly T[]` for simple array types; `Array<…>` for complex element types.
- Keep mapped and conditional types rare and simple; "a little repetition beats a clever type." Prefer interface extension over `Pick`/`Omit` chains where readable.
- No `{}` type (use `unknown`, `Record<string, T>` or `object`). No wrapper types (`String`, `Number`, `Object`). Avoid return-type-only generics.
- Prefer small named object types or tuples over unnamed "pair" structures; names beat positions.

### 3.10 Comments and documentation
- `/** JSDoc */` for documentation users of the code should read; `//` for implementation notes. Multi-line implementation comments are several `//` lines, not `/* */` blocks.
- JSDoc is Markdown. Use real Markdown lists; plain-text indentation is lost.
- **Do not repeat types in JSDoc** (no `@param {string}`, no `@override`/`@private` where keywords exist).
- **Document all exported top-level symbols** and anything whose purpose is not obvious from its name. Do not restate the name. `@param`/`@return` only when they add information.
- Describe methods with a verb phrase in the third person ("Creates a person…"), as if "This method…" came first.
- Where a call's meaning is unclear (a bare `true`), prefer an options object; otherwise a parameter-name comment: `/* sendSms= */ false`.
- Mark deprecated items with `@deprecated` plus clear instructions on what callers should do instead.
- `TODO(#issue): …` only; no orphan TODOs.

### 3.11 Policies
- **Consistency:** for anything not settled here, do what the surrounding code does. New files follow this guide even if neighbours do not.
- **Never mix reformatting or opportunistic style fixes into a functional change.** Put them in their own commit (this is one reason our commits are small).
- Generated code is exempt from style, but identifiers you reference from hand-written code must follow naming rules.

## 4. Google's code-review standard (the agent's self-review standard)

**Purpose:** every change should leave the overall **code health** of the system better over time. Tools and processes exist for that.

- **Approve (or commit) when a change definitely improves code health, even if it is not perfect.** There is no perfect code, only better code. Seek continuous improvement, not perfection.
- Developers must be able to **make progress**; reviewers must not let code health **decrease**. Codebases decay through many small shortcuts, so do not accept "small" degradations.
- Optional polish is marked **`Nit:`** (non-blocking). Teaching comments that are not required are also marked as such.
- Nothing justifies making code health worse except a genuine **emergency** (production down, security hotfix). Emergency fixes still get tests and a follow-up clean-up commit as soon as possible.
- Disagreement: first try to reach agreement using these documents; if stuck, meet, record the result, then escalate to the project owner. **Do not let a change sit** because of a disagreement.
- A reviewer may refuse a change **only for being too large** and ask for smaller ones. Keep changes small in the first place.

## 5. What to check on every change (Google's review areas, adapted)

| Area | Question | CMS-specific check |
| --- | --- | --- |
| **Design** | Do the pieces fit the system? Does this belong here (module, library)? Is now the right time? | Layer rules respected; right module owns it; no cross-module table access. |
| **Functionality** | Does it do what was intended and is that good for users (end users **and** future developers)? Edge cases? | Mobile, slow network, Swahili/English, empty/error states. Think about concurrency and double-submit. |
| **Complexity** | Can a reader understand it quickly? Could a future caller easily break it? | **No over-engineering:** solve the problem we have now, not one we might have. No speculative flexibility. |
| **Tests** | Correct, sensible, useful? Will they fail when the code breaks? | Same commit as the behaviour. Includes permission and **cross-church** tests. |
| **Naming** | Long enough to say what it is, short enough to read? | Domain words churches use (member, household, ministry), consistent everywhere. |
| **Comments** | Clear, necessary, mostly *why*? | Remove stale TODOs and comments the change makes obsolete. |
| **Style** | Follows this guide? | Style-only changes go in separate commits. |
| **Consistency** | Matches surrounding code where no rule applies? | Note cleanup as `TODO(#issue)` instead of mixing it in. |
| **Documentation** | Did build/test/use/release behaviour change? | Update docs/OpenAPI; delete docs for deleted code. |
| **Every line** | Did you read and understand all human-written lines? | Generated files may be skimmed; hand-written code never. |
| **Context** | Look at the whole file and system, not just the diff. | Does a "four-line" change push a 50-line function past the size limit? |
| **Good things** | Note what was done well. | Mention strong patterns in the task report. |

Specialist concerns need explicit attention, not assumption: **security, privacy, concurrency, accessibility, internationalisation** (see `04-security.md`).

## 6. Size and shape of changes (Google "Small CLs", applied)

Full commit rules are in `06-git-discipline.md`. The code-quality view:

- The right size is **one self-contained change** that does **one thing** — usually one *part* of a feature. Err on the side of too small.
- It includes **its own tests**. "Small" means conceptually focused, not just few lines.
- Everything a reviewer needs is in the change, its message, the existing code, or an earlier commit.
- The system **keeps working** after the change. Never break the build between commits.
- **Do not add code nothing uses.** A new function, schema or endpoint arrives with a test that exercises it (or its first real caller), so reviewers see how it is used and unused API never lands.
- Google's guide: ~100 lines is usually reasonable; ~1000 is usually too large; the number of files also counts. **Our target is stricter** (under ~50 lines).
- Deleting a whole file counts as roughly one line; large mechanical changes produced by a trusted automatic refactoring tool are acceptable if reviewed as such (and committed alone).
- **Refactoring is separate** from features and bug fixes. Moving or renaming a class is its own commit. (Google tolerates tiny local clean-ups inside a feature; **we do not**.)
- If code to be refactored lacks tests, **add tests first** in their own commit, then refactor.
- Splitting strategies: **stack** commits in sequence; **split by files** (e.g. schema/migration first, code that uses it next); **horizontally** by layer (repository → service → handler → UI); **vertically** by feature slice. Plan the split before coding.

## 7. Testing (Google testing guidance, applied)

**Why:** automated tests let the system change safely and scale; prevention beats cure.

**Test sizes** (Google's way of thinking): *small* = single process, fast, no network or real I/O; *medium* = one machine (e.g. real Postgres, handler tests); *large* = multiple machines/networks (e2e). Google's first-guess mix is about **70% small / 20% medium / 10% large**; treat it as a starting point shaped like a pyramid, not a target. Unit tests are fast: about a tenth of a second is already slow. If two parts do not fit together, prefer a focused integration test over another end-to-end test. Keep a **few** end-to-end tests for the critical flows.

Rules:
1. **Test behaviours, not methods.** One public method can have many behaviours and one behaviour can span methods. Structure tests as *given / when / then* and name them after the behaviour: `rejects registration when the event is full`.
2. **Test through public APIs** (service functions, HTTP endpoints), not private internals. Tests should survive refactoring; if a behaviour-preserving refactor breaks a test, the test was too coupled.
3. **Prefer state testing over interaction testing.** Check the resulting state or returned value, not which methods were called. Keep test doubles to a minimum; use real implementations when they are fast and deterministic. For repositories use a **real Postgres (Neon test branch or container)** rather than mocking Drizzle.
4. **No logic in tests** (no loops/branches that can hide bugs). A test should be obvious on inspection.
5. **DAMP, not DRY:** tests should be *Descriptive And Meaningful Phrases*. Some repetition is fine if it makes each test readable on its own. Share setup through small **builder/factory helpers**, not big shared mutable fixtures.
6. **Clear failure messages:** when a test fails it should say what went wrong and where.
7. **Complete and concise:** include every fact the reader needs and nothing irrelevant.
8. Tests are code: keep them simple and maintained; do not accept complexity in tests just because they are not shipped.
9. Tests ship **in the same commit** as the behaviour they cover (except emergencies), and a test must be able to **fail** when the code is wrong (check it).
10. Deterministic and hermetic: no real network, no wall-clock time (inject a clock), no test-order dependence. A flaky test is a bug.
11. **Mandatory families:** validation failures, permission denied, **cross-church isolation**, pagination limits, idempotent retries.
12. Fake data only; no real member data.

## 8. Documentation expectations

- If a change alters how people **build, test, run, use or release** the system, update the README/docs/OpenAPI in the same task (own commit).
- If a change deletes or deprecates code, delete or update its documentation.
- Documentation of a module or function states **purpose, how to use it, and how it behaves**; comments explain **why** a piece of code exists.

## 9. Project rules beyond Google's guides

### 9.1 TypeScript configuration
`strict: true`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`. Derive types from Zod schemas (`z.infer`) so validation and types never drift. Immutability by default (`readonly`, no mutating arguments). No floating promises; handle rejections; set timeouts on outbound calls.

### 9.2 Structure
One reason to change per file; aim under ~250 lines per file and ~40 per function (Google's function-length signal). Cyclomatic complexity under ~10. Pure functions for rules; side effects at the edges (repositories, adapters). Extract duplicated *business rules* on the third occurrence. No dead code, no commented-out code, no unused exports. Name magic numbers and strings.

### 9.3 React / UI
Server Components by default; `'use client'` only where needed, low in the tree. Components are pure; follow the rules of hooks. Keep state minimal and derived values derived. **Mobile first and accessible (WCAG 2.1 AA):** semantic HTML, labelled inputs, keyboard and screen-reader support, adequate contrast and touch targets. Light bundles and lazy loading for weak networks. **No hard-coded UI strings** (Swahili + English), locale-aware dates, numbers and TZS currency. UI never talks to the database. Forms use shared Zod schemas, clear errors, disabled-while-submitting, safe to retry.

### 9.4 Database and SQL
Schema changes only via generated migrations; never edit applied ones. Backward-compatible changes first (see `08`). Every tenant table: `church_id`, RLS, index starting with `church_id`, cross-tenant test. Select only needed columns, paginate, avoid N+1. Transactions for multi-step writes (including audit and outbox). Use constraints (not null, unique, foreign keys, checks) to protect integrity.

### 9.5 Errors and logging
Domain errors extend `AppError` with a stable `code`; mapped once in the API layer. Validate at the boundary and trust validated types inside modules. Log once where handled, with request id and church id, no personal data. No `console.log` in committed code.

## 10. Review checklist (author before each commit; reviewer on each PR)

- [ ] One self-contained change; small, readable diff; includes its tests
- [ ] Improves (never lowers) code health; nothing speculative or over-engineered
- [ ] Designed to fit the layers and module boundaries
- [ ] Names clear; comments explain *why*; exports documented
- [ ] Types precise; no `any`, no unexplained `as`/`!`; errors typed; no empty `catch`
- [ ] Behaviour, failure, permission and **cross-church** tests present and able to fail
- [ ] No sensitive data in logs, fixtures, errors
- [ ] Style-only or refactor changes are in separate commits
- [ ] Docs/OpenAPI updated if behaviour, build, test or release changed
- [ ] Accessibility and i18n handled for UI changes
- [ ] Every line understood; context of the whole file considered

## 11. Tooling that enforces this

- **TypeScript:** `tsc --noEmit` with the flags in 9.1.
- **ESLint** (`typescript-eslint`, `react-hooks`, import/boundaries) configured to mirror Google rules: no explicit `any`; ban `@ts-ignore`/`@ts-nocheck`/`@ts-expect-error` comments; no non-null assertions; `consistent-type-definitions: interface`; `consistent-type-imports`; no default exports (overrides for Next.js files); `eqeqeq` (allow `== null`); `no-var`; `prefer-const`; `curly`; `default-case` and `no-fallthrough`; only-throw-error; `no-empty` (comments allowed); `no-eval`, `no-debugger`; `no-implicit-coercion`; naming-convention rules for the casing in 3.8; `no-restricted-imports` for `next/*` inside `src/modules`.
- **Prettier:** `singleQuote: true`, `semi: true`.
- **Vitest** with coverage on `src/modules` as a smell detector (not the goal); **Playwright** for a few critical flows.
- **dependency-cruiser** (or equivalent) to fail CI on illegal imports.
- **Husky / lint-staged / commitlint** and **gitleaks** (see `06`).
- Google's `gts` package bundles Google-style linting for TypeScript; it may be consulted for rule ideas, but our ESLint config is the source of truth.

## 12. Sources and attribution

Reviewed on 2026-11-07. This document is an adaptation in our own words; read the originals for full detail and examples.

- Google TypeScript Style Guide — https://google.github.io/styleguide/tsguide.html
- Google Engineering Practices, *The Standard of Code Review* — https://google.github.io/eng-practices/review/reviewer/standard.html
- Google Engineering Practices, *What to look for in a code review* — https://google.github.io/eng-practices/review/reviewer/looking-for.html
- Google Engineering Practices, *Small CLs* — https://google.github.io/eng-practices/review/developer/small-cls.html
- Google Engineering Practices, *Writing good CL descriptions* — https://google.github.io/eng-practices/review/developer/cl-descriptions.html
- Google Testing Blog, *Just Say No to More End-to-End Tests* (test pyramid, 70/20/10 first guess) — https://testing.googleblog.com/2015/04/just-say-no-to-more-end-to-end-tests.html
- *Software Engineering at Google* (Winters, Manshreck, Wright), unit-testing chapter: maintainable tests, behaviours not methods, state over interaction testing, DAMP not DRY — https://abseil.io/resources/swe-book/html/ch12.html

The Engineering Practices pages are published openly by Google (CC BY 3.0). Check each page's licence before redistributing any text; we paraphrase and credit.
