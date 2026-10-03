# Coverage and validation

PR: opened by orchestrator

CI status: pending at time of writing

## Comparable V8 coverage

Vitest and V8 provider are 4.1.11. Application scope includes all `src/**/*.{ts,tsx}`; API/core use `src/**/*.ts`. Tests are excluded from instrumentation. Before excludes newly added QA tests; after includes them. Production source is unchanged. Four packages received no added tests: their original-suite measurement is therefore both before and after. All nine workspace suites were measured. Type-only modules with zero executable lines are N/A, not a runtime coverage failure.

Percentages preserve identical per-package source and executable-line denominators. Expected-failure tests execute product code and contribute coverage. Coverage measures execution, not correctness. Browser scripts are not instrumented and are excluded from these numbers.

| Surface | Source files | Lines covered before → after | Statements % before → after | Branches % before → after | Functions % before → after | Raw reports |
| --- | ---: | --- | --- | --- | --- | --- |
| API | 7 | 103/268 (38.43%) → 174/268 (64.92%) | 37.89 → 64.56 | 33.33 → 61.96 | 36.58 → 60.97 | [Before](artifacts/backend-coverage-before/coverage-summary.json), [after](artifacts/backend-coverage-after/coverage-summary.json) |
| Core image | 7 | 208/225 (92.44%) → 212/225 (94.22%) | 92.77 → 94.29 | 82.47 → 87.62 | 96.87 → 96.87 | [Before](artifacts/core-image-before/coverage-summary.json), [after](artifacts/core-image-after/coverage-summary.json) |
| Core audio | 7 | 212/266 (79.69%) → 245/266 (92.1%) | 78.27 → 89.65 | 76.39 → 85.09 | 58.13 → 79.06 | [Before](artifacts/core-audio-before/coverage-summary.json), [after](artifacts/core-audio-after/coverage-summary.json) |
| Web | 26 | 4/1058 (0.37%) → 50/1058 (4.72%) | 0.36 → 4.7 | 0.97 → 3.3 | 1.44 → 5.31 | [Before](artifacts/coverage-web-before-oxc/coverage-summary.json), [after](artifacts/coverage-web-after/coverage-summary.json) |
| Mobile | 16 | 14/648 (2.16%) → 147/648 (22.68%) | 2.34 → 22.84 | 4.22 → 12.98 | 3.33 → 20.83 | [Before](artifacts/coverage-mobile-before/coverage-summary.json), [after](artifacts/coverage-mobile-after/coverage-summary.json) |
| shared | 5 | 57/83 (68.67%) → 57/83 (68.67%) | 70.11 → 70.11 | 62.96 → 62.96 | 54.54 → 54.54 | [Before](artifacts/coverage-shared-unchanged/coverage-summary.json), [after](artifacts/coverage-shared-unchanged/coverage-summary.json) |
| types | 7 | N/A (0 executable lines) | N/A | N/A | N/A | [Before](artifacts/coverage-types-unchanged/coverage-summary.json), [after](artifacts/coverage-types-unchanged/coverage-summary.json) |
| ui | 5 | 3/20 (15%) → 3/20 (15%) | 15 → 15 | 0 → 0 | 0 → 0 | [Before](artifacts/coverage-ui-unchanged/coverage-summary.json), [after](artifacts/coverage-ui-unchanged/coverage-summary.json) |
| native-image-processing | 1 | 10/13 (76.92%) → 10/13 (76.92%) | 76.92 → 76.92 | 75 → 75 | 100 → 100 | [Before](artifacts/coverage-native-image-processing-unchanged/coverage-summary.json), [after](artifacts/coverage-native-image-processing-unchanged/coverage-summary.json) |

## Test counts

The original suite was rerun explicitly excluding all QA filenames: **148 passed** across nine workspaces. Final `pnpm -r test`: **270 passed + 15 expected failures = 285 cases**, **137 added cases**. Of those additions, 122 pass normally and 15 reproduce confirmed defects. All 15 expected-failure assertions were separately run as ordinary assertions to prove their intended failure; see [Backend](passes/BACKEND.md), [Frontend](passes/FRONTEND.md), and [core supplement](passes/CORE-SUPPLEMENT.md). Browser cases are listed separately in [UX](passes/UX.md).

| Workspace | Before | After | Added |
| --- | ---: | --- | ---: |
| API | 43 | 97 pass + 7 expected fail | 61 |
| Core image | 19 | 37 pass | 18 |
| Core audio | 32 | 62 pass + 1 expected fail | 31 |
| Web | 5 | 14 pass + 2 expected fail | 11 |
| Mobile | 9 | 20 pass + 5 expected fail | 16 |
| Shared | 16 | 16 pass | 0 |
| UI | 8 | 8 pass | 0 |
| Types | 11 | 11 pass | 0 |
| Native bridge | 5 | 5 pass | 0 |

[Original suite evidence](artifacts/review-original-suite-baseline.txt), [final suite evidence](artifacts/review-final-workspace-tests.txt), [unchanged-package coverage](artifacts/review-unchanged-package-coverage.txt), [final static checks](artifacts/review-final-static-checks.txt).

## Invalid attempts retained

The first workspace run picked up an in-progress image test before shared build outputs/source aliases were ready. The original tests passed, but that whole run was not a clean baseline. The explicit original-suite rerun supersedes it. The first typecheck ran before workspace project-reference outputs existed and failed TS6305; CI already builds before typechecking, and post-build/final checks pass.

The first two web coverage attempts excluded TSX files because Next preserves JSX and Vite 8 did not honor the attempted esbuild transform. Their artifacts remain as dead ends (`coverage-web-before` and `coverage-web-before-valid`; the latter name is misleading). Only `coverage-web-before-oxc` is authoritative: it includes the same 26 files and 1,058 executable lines as after. A two-line test configuration change enables OXC automatic JSX for valid instrumentation. No product source was modified.

## Remaining untested areas

- API server/bootstrap/plugins (0% line coverage), real Supabase verification, PostgreSQL constraints/RLS/transactions, actual proxy topology and load. API tests use injection and mocked dependencies.
- Web pages/components, most auth/playback code and middleware have little direct unit coverage; browser flows add separate evidence. Shared UI primitives are only 15% line covered.
- Mobile screens, native runtime/audio/image decoders and actual Keychain/Keystore behavior. The mobile build script only prints an EAS requirement; it is not a native build.
- Domain inputs outside the seeded valid-value corpus, arbitrary image contents/presets and subjective audio quality. MIDI is now 96.96% line covered; actual DAW import remains untested.
- Shared API retry/timeout and logging/config paths remain partly uncovered; no invented idempotency contract was imposed on create operations.
- Accessibility is sampled with axe and manual DOM/focus inspection, not complete WCAG certification or a physical screen-reader listening session.
- Hosted CI and exact Node 20.19.4 parity are pending. Local runtime is Node 26.7.0. Installing the CI Node package was attempted; npm blocked its install script, and the direct binary package version was unavailable (ETARGET). This is an environment limitation, not a product finding.
- Live vulnerability advisories were not queried: the orchestrator permits network only for installing/fetching public packages. Dependency inventory is captured, but vulnerability count is unknown. Offline secret scans exclude environment/credential files and git history.
