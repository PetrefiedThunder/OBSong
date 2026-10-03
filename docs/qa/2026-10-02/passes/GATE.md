# Independent QA gate review

PR: opened by orchestrator

CI status: pending at time of writing

## Decision

Reviewed QA-only scope is acceptable. No product behavior changes or unrelated modifications were found. The reported BE-001, BE-002, BE-003, BE-101, FE-001, FE-002 and FE-003 failures agree with the current implementation and represent real defects. This review does not certify a release; final workspace validation and final document assembly are owned by the coordinating pass.

The reviewer verified checkout /Users/sellers/Projects/qa-sweep-2026-10-02/OBSong, branch qa/2026-10-02-sweep, origin https://github.com/PetrefiedThunder/OBSong.git, HEAD 371ad7e. Source/test review was read-only. Only this gate report was authored by this reviewer; the shared command runner also appended its audit log and evidence files.

## Evidence reviewed

- API schemas/auth/service tests and matching source. BE-001's five cases fail at the 400-versus-201 assertion (apps/api/src/__tests__/qa.boundaries.test.ts:87); BE-002 fails at the final merged-document assertion (qa.persistence.test.ts:110); BE-003 fails at the one-hop IP assertion (qa.proxy.test.ts:33). These exact negative-control failures are captured in artifacts/backend-negative-control.txt. The provider is mocked and no database was contacted, as the report states.
- Shared image/audio property corpora and MIDI round trips. BE-101 fails because changing the final texture sample does not change the output (packages/core-audio/src/__tests__/qa-invariants.test.ts:98), matching floor-division segmentation at packages/core-audio/src/mappers.ts:545. Its normal-test negative control is captured in artifacts/backend-core-pad-negative-control.txt.
- Web image boundaries. FE-001 matches fractional dimensions returned from apps/web/src/lib/imageProcessing.ts:74 after canvas truncation. The 1301x2000 portrait case also failed in the real connected-browser session (artifacts/ux-browser-report.json), independently supporting the canvas model used in the unit test.
- Mobile account isolation. FE-002's delayed cache hydration writes state without rechecking active identity (apps/mobile/src/state/CompositionsProvider.tsx:89); delayed deletion combines the next account's shared ref with the old callback's cache key (:220 and :228); detail reads return old-account data despite skipping provider-state updates (:156). apps/mobile/src/screens/CompositionDetailScreen.tsx:57 consumes that return value. The tests model these awaits with controlled promises and switch the actual provider's auth context.
- Secure storage lifecycle. FE-003 matches parsing JSON metadata with Number.parseInt (apps/mobile/src/auth/secureStorage.ts:28), yielding NaN and skipping the chunk deletion loop. Independent round-trip tests establish that the fake stores implement the expected storage boundary; no device keychain was accessed. The evidence proves orphaned encrypted chunks, not successful use of revoked credentials.
- Expected failures carry finding IDs. Existing assertions were not weakened. Passing cases cover ordinary behavior around the negative paths. No tests, schemas, migrations, deployment settings or source behavior were modified by this reviewer.
- Added runtime test renderer exactly matches installed React 19.2.3. Added types match the repository's existing React 18 type family. Local web/mobile typechecks and focused ESLint succeeded according to artifacts/frontend-tests_typecheck.txt and artifacts/frontend-added_tests_lint.txt; the root pass is additionally validating the CI Node version.
- The browser regression config requires the orchestrator WebSocket endpoint and does not directly launch browsers. The scripts intercept external requests and use synthetic auth/API data. Native audio fidelity, provider behavior and real device semantics remain outside the evidence.

## Coverage assessment

Use artifacts/coverage-web-before-oxc/coverage-summary.json for the web baseline, not the misleadingly named coverage-web-before-valid directory: that intermediate attempt contains TSX parse exclusions. The repaired before/after reports both contain 26 web source files and 1,058 executable lines; mobile reports both contain 16 source files and 648 executable lines. Broad source scopes include zero-covered screens and bootstrap code. Backend and core reports explicitly separate coverage from behavioral correctness and include expected-failure execution in their after numbers. No universal or whole-app confidence should be inferred from the improved percentages.

## Closeout conditions and residual limits

FRONTEND.md and artifacts/frontend-negative_controls_pipeline_options.txt were reviewed in a closeout read. All seven frontend negative controls failed at the intended product assertions, with 20 positive controls passing and the expected-failure test bytes restored. The portrait test now explicitly uses the averageRows/rowsToAverage options from the real pipeline, reproducing RangeError. Backend and core controls also remain valid. Two report citation corrections were sent to the root: CompositionsProvider.ts must be CompositionsProvider.tsx, and CompositionDetailScreen.tsx consumes detail at line 57, not lines 60-61. Final consolidated docs and expanded UX regression results remain owned by the root pass. Final CI status must remain pending, because no remote PR/CI was contacted.

No additional targeted rerun was necessary for the source-backed findings; the final workspace test/typecheck/lint pass is coordinated by the root to avoid concurrent mutations. Cross-browser sessions, native rendering, real database isolation and a live vulnerability advisory audit are distinct evidence categories; tests with mocks do not establish those results.

The review-pr and code-review skill guidance informed this review. CodeRabbit remote execution was excluded by the orchestrator's restriction on third-party service access; no authentication or external review API was used.

## Command accounting

Every executed shell command used the shared UTC logger and appears in [REVIEW-LOG.md](REVIEW-LOG.md) and [SESSION-LOG.md](../SESSION-LOG.md). Dead ends were retained: gate_reports exited 1 because no AGENTS.md file matched, and gate_final_inventory exited 2 because FRONTEND.md was not yet present. Subsequent explicit reads covered the available files. A first gate_write_report invocation failed shell parsing before the runner started (zsh unmatched quote); no command or file mutation ran. This retry records that failed invocation. Evidence is stored under artifacts/review-gate_*.
