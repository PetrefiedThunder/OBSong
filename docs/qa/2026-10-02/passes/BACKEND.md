# Backend QA pass

PR: opened by orchestrator

CI status: pending at time of writing

## Scope and approach

Checkout verified as `/Users/sellers/Projects/qa-sweep-2026-10-02/OBSong`, branch `qa/2026-10-02-sweep`, origin `https://github.com/PetrefiedThunder/OBSong.git`, initial HEAD `371ad7e`.

This is a Fastify API backed by Supabase Auth and PostgREST. Highest risks are private composition isolation (impact 5 × likelihood 3), data loss on simultaneous edits (5 × 3), persisted music payload correctness (4 × 4), and auth/cache failure handling (4 × 3). Existing tests cover routes with authentication mocked and services with Supabase mocked; the additional pass exercises real authentication plus route schemas and service behavior, with Supabase entirely mocked.

Methods: test pyramid (unit checks, Fastify injection integration, no production end-to-end), boundary/equivalence cases, deterministic malformed-input corpus, an auth/ownership matrix, and a timed exploratory code review. Coverage is measured before and after added tests with identical source scope. JSON schemas in `routes/compositions.ts` are the runtime contract; no OpenAPI document was found in the API inventory.

## Exploratory charter

Charter BE-C1: up to 20 minutes of focused exploration before final validation, starting 2026-10-03T01:20:58Z. Trace a request through auth, schema validation, ownership checks and persistence. Try missing/invalid authentication, foreign ownership, boundary music values, cache expiry and concurrent disjoint updates. Preserve product code and add expected-failure tests for confirmed defects. The compact API allowed completion within the time box; all three defect hypotheses were reproduced by 2026-10-03T01:24:20Z.

Safety: do not import `server.ts` (it loads dotenv and calls `start()` at module import), do not read environment files, and do not connect to Supabase or a database. All checks use synthetic values and local in-process injection. Existing test configuration contains a dummy localhost fixture only. Server/plugin integration and live RLS cannot be established by this pass.

## Results

Baseline: **43 passing tests** in two existing files. Added **61 cases**, comprising 54 passing assertions and seven expected failures covering three findings. Final API run: **97 passed, 7 expected fail, 104 total**, across six files. Product code, environment files, migrations, deployment configuration and credentials were not changed.

Exact command timestamps and complete output are recorded in [BACKEND-LOG.md](BACKEND-LOG.md), the aggregate [SESSION-LOG.md](../SESSION-LOG.md), and referenced artifacts. Initial inventory exited 1 because no additional AGENTS.md matched. The first contract search mentioned a nonexistent `packages/core/src`; subsequent inspection used actual `packages/core-audio/src`. Neither dead end blocked the pass. Vitest reports a pre-existing future Vite config-loader compatibility warning; it did not fail testing.

| Run | Result | Evidence |
| --- | --- | --- |
| Existing API baseline with QA tests excluded | 43 passed | [baseline output](../artifacts/backend-baseline-coverage.txt) |
| First added-test run | 54 passed, 7 expected fail | [added tests](../artifacts/backend-added-test-first-run.txt) |
| Complete API suite with coverage | 97 passed, 7 expected fail | [after output](../artifacts/backend-after-coverage.txt) |
| Negative controls: temporary copies with `it.fails` changed to `it`, filtered to findings | Seven assertion failures, as intended | [negative control](../artifacts/backend-negative-control.txt) |

The negative-control copies are outside the checkout. They prove the expected failures are due to observed defects (201 versus 400, overwritten title, wrong proxy IP), not import errors or unavailable services. Expected failures remain explicit in repository tests so the current CI stays green; a future product fix will require removing the matching `fails` marker.

## Findings

Counts: Critical=0 High=1 Medium=2 Low=0

| ID | Severity | Group | Title | Exact reproduction | Expected versus actual | Evidence | Suggested fix |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BE-001 | Medium | Backend | Composition schema accepts invalid musical values | Run `corepack pnpm --filter @toposonics/api exec vitest run src/__tests__/qa.boundaries.test.ts -t BE-001`. The local injected authenticated POST starts from a valid payload and independently substitutes note `H4`, mappingMode `UNKNOWN_MODE`, key `Z`, scale `UNKNOWN_SCALE`, or effects.reverbSend string `loud`. | Expected 400 without persistence for values outside shared musical contracts; actual 201 and a service call for all five variants. Invalid note strings later throw in the shared MIDI note parser. | `apps/api/src/routes/compositions.ts:44`, `:50`, `:63`; `packages/types/src/mapping.ts:8`, `:18`, `:40`; `packages/types/src/audio.ts:19`; `packages/core-audio/src/scales.ts:141`; `apps/api/src/__tests__/qa.boundaries.test.ts:81`; [negative control](../artifacts/backend-negative-control.txt) | Validate note notation against the supported parser and constrain mappingMode/key/scale to supported values. Type and bound known effect fields while preserving intentional future extension fields. Apply to create and update. |
| BE-002 | High | Backend | Concurrent partial updates silently discard a successful edit | Run `corepack pnpm --filter @toposonics/api exec vitest run src/__tests__/qa.persistence.test.ts -t BE-002`. The deterministic provider stub lets two calls read the same row, then concurrently applies `{title: 'New title'}` and `{description: 'New description'}`. | Expected both disjoint edits to survive or an explicit stale-write conflict; actual both calls resolve successfully, but final title reverts to `Original title` while description changes. This is proven at the service boundary; no real database was contacted. | `apps/api/src/services/compositions.ts:252`, `:258`, `:269`; `apps/api/src/__tests__/qa.persistence.test.ts:85`; [negative control](../artifacts/backend-negative-control.txt) | Use optimistic concurrency with a version/updated-at precondition and return a conflict, or an atomic server-side JSONB partial update scoped to the owner. Never silently overwrite a stale whole document. |
| BE-003 | Medium | Backend | Numeric proxy hop configuration trusts every forwarded hop | Run `corepack pnpm --filter @toposonics/api exec vitest run src/__tests__/qa.proxy.test.ts -t BE-003`. Stub `TRUST_PROXY=1`; inject a local request from 127.0.0.1 with the synthetic forwarding chain `198.51.100.1, 203.0.113.10`. | Expected the one-hop client address `203.0.113.10`; actual `198.51.100.1`, because every positive integer becomes boolean true. This makes client IP and IP-based rate limiting spoofable when a deployment uses the documented numeric option and the edge does not sanitize the chain. Default false is verified safe. Actual deployment settings were not inspected. | `apps/api/src/config.ts:6`, `:16`, `:66`; `apps/api/src/server.ts:34`, `:118`; `apps/api/src/__tests__/qa.proxy.test.ts:22`; [negative control](../artifacts/backend-negative-control.txt) | Implement an explicit hop-count trust callback supported by Fastify, or reject numeric settings and require a trusted proxy IP/CIDR. Correct the accompanying documentation. |

The comment in `apps/api/src/config.ts:6` and user guidance at `:66` promise numeric hop-count semantics that implementation `:16` does not preserve. This is a code/documentation mismatch, not a reason to use the documented value during this QA pass.

## Coverage

Both measurements use the same denominator: `src/**/*.ts`, excluding `src/__tests__/**`, including zero-covered `server.ts` and `supabase.ts`. Baseline excludes `**/qa.*.test.ts`; after includes them. Expected-failure cases execute real source paths and therefore contribute to the after coverage; coverage is not a claim that those paths are correct.

| API metric | Before | After |
| --- | ---: | ---: |
| Statements | 37.89% | 64.56% |
| Branches | 33.33% | 61.96% |
| Functions | 36.58% | 60.97% |
| Lines | 38.43% | 64.92% |

After line coverage: auth 100%, config 94.44%, composition routes 96.36%, health routes 100%, composition service 94.36%, server and provider bootstrap 0%. Raw artifacts: [before summary](../artifacts/backend-coverage-before/coverage-summary.json), [after summary](../artifacts/backend-coverage-after/coverage-summary.json), [before detail](../artifacts/backend-coverage-before/coverage-final.json), [after detail](../artifacts/backend-coverage-after/coverage-final.json).

## Authentication and permissions matrix

| Surface | Anonymous | Invalid token | Authenticated owner | Other owner |
| --- | --- | --- | --- | --- |
| GET /health | 200; no memory object | Public route | Public route | Not applicable |
| GET /health/detailed | 401 | 401 | 200 with memory details | Any valid account intentionally allowed |
| GET /compositions | 401 | 401 | User-scoped list verified | Service equality filter verified; real RLS not tested |
| GET /compositions/:id | 401 | 401 | 200 existing test | 404 existing test |
| POST /compositions | 401 | 401 | 201, server-assigned owner | Forged userId/id stripped and service allowlist verified |
| PUT /compositions/:id | 401 | 401 | 200 existing test; service-scoped mutation | 404, no service mutation |
| DELETE /compositions/:id | 401 | 401 | 200 existing test; id+owner filter verified | 404, no service mutation |

Cache checks verify user mapping, exact 30-second expiry, invalidation after expiry, and eviction at the 5,000-entry limit. Ownership evidence combines route tests and service filter assertions; it does not substitute for a live database permission audit.

## OWASP API Top 10 review

| Category | Result and limitation |
| --- | --- |
| API1 Broken Object Level Authorization | Existing foreign-owner read/update/delete tests pass; list and mutations include user filters. Single-object reads use service-role access and rely on route ownership checks. Real RLS is out of scope. |
| API2 Broken Authentication | Real middleware rejects missing/malformed/invalid fixtures; token cache expiry/cap tested. Live Supabase, JWT verification internals, provider outages and concurrent cache misses not tested. |
| API3 Broken Object Property Level Authorization | Top-level route and service allowlists reject/drop ownership and system-field injection. BE-001 identifies insufficient musical-value validation. |
| API4 Unrestricted Resource Consumption | Static review sees 10MB server body limit, bounded list size, 100,000-note array cap, rate-limit and pressure plugins. BE-003 weakens IP-derived limits under the numeric proxy setting. Sustained load and plugin integration not measured. |
| API5 Broken Function Level Authorization | All composition routes and detailed health have requireAuth; basic health is intentionally public. No admin-only route or role hierarchy found. |
| API6 Unrestricted Access to Sensitive Business Flows | No purchasing or billing flows in this API. Creation has no idempotency-key contract, so automatic create retries were not assumed safe or defect-free. |
| API7 Server Side Request Forgery | No request-controlled outbound URL fetch in inspected auth/composition routes; provider URL is configured. No network probes performed. |
| API8 Security Misconfiguration | Default proxy trust false tested; numeric override BE-003. Server CORS/HTTPS/helmet configuration reviewed statically only because its module starts the server and loads dotenv. |
| API9 Improper Inventory Management | API README and route files enumerate the same composition/health endpoints; runtime schemas exist, no OpenAPI spec found. Server root/status inventories reviewed statically. |
| API10 Unsafe Consumption of APIs | All five composition handler failures return generic INTERNAL_ERROR without synthetic private provider details. Runtime response validation, real provider behavior and supply-chain advisory audit are separate validation surfaces. Dependency audit is coordinated by the root QA pass. |

## Remaining limits and next-fix order

1. Fix BE-002 first because successful concurrent edits can lose user work.
2. Fix BE-003 before relying on numeric proxy configuration for IP rate limiting.
3. Fix BE-001 and convert its five expected-failure cases into normal tests.

Build/typecheck/lint and public-package vulnerability audit are coordinated by the root QA pass to avoid duplicate processes. This pass has no permission to contact production, real auth, or databases. Consequently database constraints/RLS, transaction behavior against PostgreSQL, real idempotency/retry behavior, provider availability, production proxy topology, CORS/HTTPS and shutdown integration remain unverified. No native database or external API fixture was used. Deterministic equivalence/boundary corpora were chosen instead of adding a property-testing dependency to this compact API.
