# QA fix pass — 2026-10-02

Branch: `qa/2026-10-02-fixes`. Sweep baseline: `fb852f7`. Work performed 2026-10-02 PDT / 2026-10-03 UTC. All changes are local commits; no push, PR, merge, deployment, production request, or database migration occurred.

Required order from SUMMARY.md: FE-002, BE-002, FE-001 (all High; no Critical findings). The three High fixes were committed in that order. Independent work used disjoint paths. Afterward, BE-101 received a small optional fix; BE-003 and FE-003 were assessed and deferred. Original findings and sweep artifacts remain unchanged.

## Finding outcomes

| Finding ID | Severity | Title | Status | Commit SHA | Proving test (file::name) | Notes or reason deferred |
| --- | --- | --- | --- | --- | --- | --- |
| FE-002 | High | Mobile account-switch races expose another account's compositions | fixed | `6ba26d71442d212eff9dcaeb12d3937d86d82b17` | `apps/mobile/src/state/__tests__/CompositionsProvider.qa.test.ts::FE-002: discards delayed cache hydration after switching accounts`; `::FE-002: a prior-account delete cannot persist the next account library under the old key`; `::FE-002: detail reads cannot return prior-account data after the account changes` | All three expected failures promoted. Session identity guards provider state, cache work and returned records; detail screen clears prior records and ignores stale load/delete/playback work. Added 21 tests, including the actual provider mounted with the detail screen. Mobile: 44 pass, 2 unrelated expected failures. |
| BE-002 | High | Concurrent partial updates silently discard a successful edit | fixed | `c9e9fe371ecbba05310c6d4d18f46c8c35c238a8` | `apps/api/src/__tests__/qa.persistence.test.ts::BE-002 preserves both disjoint edits from concurrent partial updates`; `apps/api/src/__tests__/compositions.routes.test.ts::BE-002 returns a retryable 409 when concurrent update attempts are exhausted` | Promoted original regression. Owner-scoped reads/writes compare the exact server-managed JSON revision and advance it monotonically; stale writes reread and merge, up to three attempts. Exhaustion returns HTTP 409 `COMPOSITION_CONFLICT`; request/success schemas are unchanged. Added 13 tests, including installed Supabase client serialization using fake fetch. API: 111 pass, 6 unrelated expected failures. No schema/migration change. |
| FE-001 | High | Resized portrait images fail the primary creation flow | fixed | `4b6f4bac0c14195bde5c0787b9c9e8d88b03b88a` | `apps/web/src/lib/__tests__/imageProcessing.qa.test.ts::FE-001: resized portrait dimensions remain integers accepted by the analyzer`; `::FE-001: a very thin image keeps both resized dimensions at least one pixel` | Both expected failures promoted. Round/clamp both dimensions before Canvas allocation, draw, read and metadata. Added 12 cases across three real analysis pipelines and portrait/landscape/thin inputs. Web: 28 pass; directly related core-image: 37 pass. |
| BE-003 | Medium | Numeric proxy hop configuration trusts every forwarded hop | deferred | — | Original `apps/api/src/__tests__/qa.proxy.test.ts::BE-003 trusts only one proxy hop when TRUST_PROXY=1` remains expected failure | Installed Fastify 5.12.3 deliberately disables numeric-only trust: `docs/Reference/Server.md:640-648,670-672` and `lib/request.js:43-57` under `apps/api/node_modules/fastify`. A hop-only callback would bypass that security safeguard. Trusted proxy addresses/topology are unknown and production/env inspection is out of scope. Rejecting a previously accepted numeric setting can prevent startup and needs an explicit compatibility/deployment decision. Config and test unchanged. |
| FE-003 | Medium | Sign-out leaves chunked session values in encrypted storage | deferred | — | Original `apps/mobile/src/auth/__tests__/secureStorage.qa.test.ts::FE-003: sign-out removes every encrypted chunk of a long session` and replacement case remain expected failures | The requested deferral rule excludes credential-related changes. Fixing encrypted session cleanup touches credential storage. No auth-storage source or test was changed. |
| BE-101 | Medium | Pad mapper discards trailing texture samples | fixed | `76c63419674095ef3ad393a56d49abaa551f9082` | `packages/core-audio/src/__tests__/qa-invariants.test.ts::BE-101: pad segmentation includes a final partial texture segment` | Promoted original regression; final segment includes the remainder, preserving earlier boundaries. Added two tests for the normal 128-sample profile's trailing indices 126 and 127. Core-audio: 65 pass. |

## Counts

Counts below cover the six findings assessed in this fix pass; the seven other optional findings listed under remaining risks were left unchanged.

| Severity | Fixed | Partial | Deferred |
| --- | ---: | ---: | ---: |
| Critical | 0 | 0 | 0 |
| High | 3 | 0 | 0 |
| Medium | 1 | 0 | 2 |
| Low | 0 | 0 | 0 |
| Included total | 4 | 0 | 2 |

Critical and High only:

FixCounts: fixed=3 partial=0 deferred=0

## Full validation before and after

The baseline was rerun before source changes and exactly matched the sweep's final results in COVERAGE.md/SUMMARY.md. Runtime: Node 26.7.0, pnpm 8.15.0, Vitest 4.1.11. Tests use local fixtures/mocked providers; no live services.

| Full workspace suite | Pass | Unexpected fail | Expected fail | Skip | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Sweep handoff baseline | 270 | 0 | 15 | 0 | 285 |
| Before fixes, rerun this session | 270 | 0 | 15 | 0 | 285 |
| After all fixes, `corepack pnpm -r test` | 325 | 0 | 8 | 0 | 333 |

Added 48 regression cases and converted seven existing expected failures to ordinary passes. No existing test was weakened. No unexpected pre-existing failures or introduced regressions were found, so no revert was needed.

| Workspace | Before: pass / xfail | After: pass / xfail |
| --- | --- | --- |
| API | 97 / 7 | 111 / 6 |
| Core audio | 62 / 1 | 65 / 0 |
| Core image | 37 / 0 | 37 / 0 |
| Mobile | 20 / 5 | 44 / 2 |
| Web | 14 / 2 | 28 / 0 |
| Shared | 16 / 0 | 16 / 0 |
| Types | 11 / 0 | 11 / 0 |
| UI | 8 / 0 | 8 / 0 |
| Native image bridge | 5 / 0 | 5 / 0 |

Remaining eight expected failures are unchanged: BE-001 (5), BE-003 (1), FE-003 (2). Negative-control failures recorded in FIX-SESSION-LOG.md are intentional pre-fix demonstrations, not final-suite regressions. FE-002's intermediate layout-effect issue was caught by a composed regression and corrected before commit.

| Check | Before | After | Qualification |
| --- | --- | --- | --- |
| `corepack pnpm -r --sort --if-present build` | pass | pass | Real web/API/shared builds; Google Fonts mocked and provider URLs synthetic loopback fixtures. Existing mobile build only prints the EAS requirement. |
| `corepack pnpm -r typecheck` | pass | pass | All nine workspaces, after generated reference outputs were built. |
| `corepack pnpm -r --if-present lint` | pass | pass | All supported lint scripts (API, web, mobile). |
| Staged `gitleaks protect --staged --redact` | N/A | pass for each fix | Explicit paths only; no baseline/ignore changes. Final docs are scanned before their commit. |
| Browser regressions | sweep: 2 pass / 4 expected fail | blocked; 0 executed | No inherited browser endpoint. Installed Chromium launch failed with macOS MachPort bootstrap permission denied (1100), SIGTRAP. No escalation, altered browser tests, or replacement success claim. |

Pre-existing Vite native-loader compatibility and Next multiple-lockfile/root-detection warnings remain. No dependencies were changed; no finding required an upgrade. Coverage percentages were not remeasured.

## Remaining risks and limits

- BE-002 actual PostgreSQL/PostgREST execution, triggers, constraints and RLS remain unverified; the user prohibited remote databases. Deterministic concurrent-provider tests and the installed client with fake fetch prove application predicates/serialization, not live database behavior. Malformed non-string legacy JSON revisions now return a safe 409 rather than overwriting data; separate data repair is outside scope. External writers must participate in revision updates for this guard to cover them.
- FE-002 is verified with renderer mocks and the real provider/screen composition. Physical iOS/Android storage, native UI/audio and real Supabase sessions were not exercised. The pre-existing API client's asynchronous token lookup is unchanged; account switching during token acquisition is not covered by these provider-result tests.
- FE-001 uses real image analyzers with a deterministic Canvas model. Actual browser upload/Canvas/UI completion could not be rerun because browser launch was blocked. Prior sweep browser evidence remains historical.
- BE-003 remains unsafe for positive numeric TRUST_PROXY values until the deployment owner confirms trusted proxy addresses and compatibility intent. Default false remains covered by its existing passing test. Production settings were not inspected.
- FE-003 remains unresolved because credential storage is outside this fix pass's allowed changes.
- Untouched optional findings: BE-001 musical-payload validation (compatibility choices); UX-001 dialog focus, UX-002 selected-state semantics, UX-003 contrast, UX-004 mobile action overflow, UX-005 visible sign-out, and UX-006 demo wording/playback. These need separate scoped fixes and, for UX, a working browser validation environment.
- Exact CI Node20 parity, hosted CI, live vulnerability advisories, deployments, production behavior and customer proof are unverified. No external review service was called. Independent local gate review approved every committed fix.
- Original findings, coverage and sweep artifacts are preserved. No env file, credential, migration, deployment configuration, package manifest/lockfile, secret-scan baseline or git configuration changed.

See [FIX-SESSION-LOG.md](FIX-SESSION-LOG.md) for UTC commands, decisions, failed attempts and outcomes. Temporary raw command outputs remain at `/private/tmp/obsong-fix-evidence`; durable test totals and failure explanations are recorded in this report and the session log.
