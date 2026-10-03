# QA sweep plan — 2026-10-02

PR: opened by orchestrator

CI status: pending at time of writing

## Repository and authority

Checkout: `/Users/sellers/Projects/qa-sweep-2026-10-02/OBSong`; origin `https://github.com/PetrefiedThunder/OBSong.git`; baseline `371ad7e`; branch `qa/2026-10-02-sweep`. Clean at arrival. Product is **TopoSonics**, not the default RegEngine project in global instructions. No repository/directory AGENTS.md was found. The current task and orchestrator override older global instructions about commits, pushes, hosted review, browser launch and environment setup. All changes stay uncommitted for orchestrator review. No product fixes are planned.

## Repository map

| Surface | Implementation | Existing checks |
| --- | --- | --- |
| Backend | `apps/api`: Fastify, Supabase token validation and private composition storage; startup includes security middleware | Vitest route/service tests, TypeScript, ESLint |
| Web | `apps/web`: Next.js 15, React 18, Tone.js, upload/studio/demo/library/login | Vitest playback helper tests, TypeScript, ESLint, production build |
| Mobile | `apps/mobile`: Expo/React Native, auth, cache, Android-first image generation | Vitest cache/playback tests, TypeScript, ESLint |
| Domain | `packages/core-image`, `core-audio`, `types`, `shared`: image analysis, note mapping, MIDI, API client/contracts | Vitest suites and TypeScript builds |
| UI/native | `packages/ui`, `native-image-processing`: shared primitives/theme and native bridge | Vitest tests; native hardware/runtime separate |
| CI | `.github/workflows/ci.yml`: pnpm frozen install, build, typecheck, lint, tests on Node 20.19.4 | Read-only inspection; hosted CI left pending |

## Risk ranking (impact × likelihood, each 1–5)

| Rank | Area | Impact | Likelihood | Score | Reason |
| --- | --- | --- | --- | --- | --- |
| 1 | Private composition auth, owner checks, token/cache behavior | 5 | 4 | 20 | API uses privileged database client; one missing owner filter risks private user content |
| 2 | Composition schema, persistence, client errors/retries | 4 | 4 | 16 | Complex generated JSON crosses client/API/database boundaries |
| 3 | Image → mapping → playback/MIDI correctness | 4 | 4 | 16 | Primary value proposition; pathological inputs and asynchronous work can break the main flow |
| 4 | Browser build/runtime, dependency supply chain | 4 | 3 | 12 | Multiple frameworks, shared packages, CSP/audio/browser APIs |
| 5 | Keyboard, contrast, forms/dialogs, small screens | 3 | 4 | 12 | Dense studio controls and visual interactions can block users |
| 6 | Mobile cache/native parity and setup instructions | 3 | 3 | 9 | Separate native paths and limited automation coverage |

## Three passes and why

**Backend QA** (`passes/BACKEND.md`, `passes/BACKEND-LOG.md`): run existing suites and V8 coverage before/after added tests; exercise actual Fastify routes with injected requests and mocked Supabase. Build an anonymous/invalid/authenticated/cross-owner permissions matrix. Use equivalence classes and boundaries for payloads, errors, ownership and concurrent requests; seeded domain properties where valuable. Review OWASP API Top 10 against code. No OpenAPI document has been identified: runtime schemas plus shared types are the available contract. A dependency audit uses only public package metadata if policy/tooling allow it. An offline tracked-code secret scan excludes environment and credential files and logs only redacted metadata.

**Frontend QA** (`passes/FRONTEND.md`, `passes/FRONTEND-LOG.md`): workspace build/typecheck/lint and existing unit tests first, then focused client/mobile helper tests. Browser tests use the supplied external Playwright browser server and local Next server, with external requests blocked and deterministic fixtures. Cover public demos, image generation, playback/MIDI, sign-in/library states, console/network failures, desktop/mobile sizes. Try browser-engine connection compatibility without launching any browser. Record local navigation/resource timing as a bounded Lighthouse-style diagnostic; do not represent it as a Lighthouse production score.

**UX QA** (`passes/UX.md`, `passes/UX-LOG.md`): axe WCAG 2.2 AA automation on representative states, manual keyboard/focus and screen-reader semantics inspection, responsive screenshots, empty/loading/error/microcopy checks, and Nielsen's ten heuristics. Screen-reader semantics inspection is not a physical screen-reader listening session. UX agent supplies browser artifacts to the Frontend pass to avoid duplicate browser setup.

All three groups apply. Mobile hardware and native build coverage are replaced by source, type, unit and developer-experience review within the Frontend/UX groups; this does not claim native end-to-end coverage.

## Test pyramid and timed exploration

Most checks stay in unit/property and injected API tests; a smaller browser layer proves representative flows. Avoid adding dependencies to product manifests unless test reproducibility requires it; temporary coverage/browser tools are installed under `/private/tmp/obsong-qa-tools` and exact versions logged. Use expected-failure tests tagged with finding IDs for confirmed bugs; do not change product behavior to make checks pass.

- Backend charter: 20 minutes exploring token rejection, owner isolation, malformed composition boundaries and mocked storage failures, followed by targeted regression checks.
- Frontend charter: 20 minutes exploring client response handling, playback/export data and mobile cache recovery, followed by targeted unit tests.
- UX/browser charter: 20 minutes after server readiness exploring first visit → demo/studio → upload/generate → playback/export → library/sign-in, keyboard-only navigation and 375px mobile layout; retain screenshots and console/network evidence.
- Root verification: establish baselines, public dependency metadata/offline security review, shared-domain boundaries, consolidate findings and review every added file.

## Safety and limits

Never inspect `.env` or credential files, run deployed URLs, use real third-party credentials, run migrations/deployments, edit CI ignore/baseline files, or mutate remote systems. Tests get a restricted environment; API dependencies are mocked. Next's build-time Google font request must be satisfied by local mock data before any build/server start. No CodeRabbit API or GitHub network requests. No native app-store signing/build service, live Supabase/RLS validation, billing, actual device audio quality or production performance. Browser-engine/hardware/tooling gaps will be explicit. Dependency registry install/fetch is the only permitted external network purpose.

## Evidence and completion

Every shell command is timestamped by `tools/run.py` into `SESSION-LOG.md` plus its group log, with output under `artifacts/`; bootstrap commands are reconstructed separately. File edits and exploratory charters are recorded in pass logs. Findings require reproduction, expected/actual behavior and source/test/screenshot evidence. Coverage reports preserve their denominator and distinguish imported-source coverage from all-source coverage. Mandatory final documents: this plan, session log, findings, coverage and summary. Orchestrator alone scans, commits, pushes and opens the single draft PR; local delivery records CI as pending.

## Execution adjustments

- Added exact mobile renderer devDependencies/lock entries to reproduce real React account-switch ordering; temporary browser/coverage tools remain outside the product lockfile. Added test-only web OXC JSX configuration to include all TSX files in coverage.
- Next dev initially returned 404 because macOS file watchers hit EMFILE. `WATCHPACK_POLLING=true` resolved it on localhost3138. Product configuration was unchanged.
- Live dependency advisory audit was excluded after applying the strict network allowance; only package installation/metadata and offline inventory/secret scanning were performed. Vulnerability count is unknown.
- All three browser engines were available through the supplied connection server. Full workflows and axe ran in Chromium; Firefox/WebKit received smoke coverage.
- CI Node20.19.4 installation was attempted but not available through the permitted public package route; all successful local checks used Node26.7.0. No hosted CI claim is made.
