# QA sweep summary — TopoSonics

PR: opened by orchestrator

CI status: pending at time of writing

The three QA passes are complete. Changes are uncommitted on `qa/2026-10-02-sweep`, based on `371ad7e`. The PR line above is the required orchestrator handoff marker: this agent did not commit, push or open a PR, and no PR URL or hosted CI result was available. No production system was contacted.

Counts: Critical=0 High=3 Medium=9 Low=1

## Findings by group

| Group | Critical | High | Medium | Low | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Backend (including shared image/audio) | 0 | 1 | 3 | 0 | 4 |
| Frontend (web/mobile) | 0 | 2 | 1 | 0 | 3 |
| UX | 0 | 0 | 5 | 1 | 6 |
| Total | 0 | 3 | 9 | 1 | 13 |

## Top five risks and recommended first fixes

1. **FE-002 — Another account's compositions can appear after a mobile account switch.** Delayed cache reads, deletions and detail loads lack consistent session guards. Guard every asynchronous result and cache write before shipping shared-device account switching.
2. **BE-002 — Two successful edits can silently overwrite each other.** Concurrent partial updates merge against stale whole documents. Add a version precondition/conflict response or an atomic owner-scoped partial update.
3. **FE-001 — Valid portrait images can break the main creation flow.** A 1301×2000 PNG produces fractional resize dimensions and an analysis error. Round/clamp dimensions consistently; the browser and unit tests both reproduce this.
4. **BE-003 — Numeric proxy settings can let clients spoof the IP used for rate limiting.** `TRUST_PROXY=1` becomes unconditional trust rather than one-hop trust. Fix parsing/validation before using that documented option; production configuration was not inspected.
5. **FE-003 — Mobile sign-out leaves encrypted session chunks behind.** Cleanup parses JSON metadata incorrectly. Decode the writer's schema and remove all old chunks; tests use synthetic values and do not demonstrate use of revoked credentials.

Next fix UX-005 (visible sign-out), UX-001/002/003 (dialog focus, selection semantics and contrast), UX-004 (mobile actions overflow), BE-001 (musical payload validation), BE-101 (pad mapping drops trailing samples), and UX-006 (Play Demo wording/behavior). Convert corresponding expected-failure tests to ordinary tests with each product fix.

## Validation and evidence

- **Original suite:** 148 passing tests. **Final suite:** 270 ordinary passes plus 15 expected failures, 285 total. Added 137 cases; all 15 known-bug assertions also failed as intended in negative-control runs. No existing test was weakened.
- **Browser:** two ordinary passes plus four expected failures; Chromium, Firefox and WebKit smoke passed. Full Chromium exploration exercised valid upload/generate/play/stop/MIDI, portrait/corrupt input, stubbed sign-in, library empty/loading/error/retry, save retry and edit. Eighteen screenshots and JSON reports are retained.
- **Static/build:** [frozen-lock install](artifacts/review-final-frozen-install.txt), [workspace TypeScript/lint](artifacts/review-final-static-checks.txt) and [production web/API/shared builds](artifacts/review-final-build.txt) pass locally. The mobile build command is a placeholder, not a native build. Google Fonts was mocked locally; existing root-detection/Autoprefixer/Vite warnings remain in logs.
- **Coverage:** API lines 38.43%→64.92%; core-image 92.44%→94.22%; core-audio 79.69%→92.10%; web 0.37%→4.72%; mobile 2.16%→22.68%. All nine workspaces have coverage reports, with unchanged-package measurements and denominator caveats in [COVERAGE.md](COVERAGE.md).
- **Security:** real auth middleware and mocked owner permissions matrix, malformed payload corpus, generic error handling, token-cache boundaries and OWASP API Top10 review completed. [Final offline redacted scan](artifacts/code-secret-scan-final.json) found no secret exposures across 408 scanned source/documentation/evidence files; the initial tracked-source scan covered 188 files. Environment/credential files and history were excluded. Live vulnerability count is **unknown**; the network policy disallows advisory service access.
- **Independent review:** [gate report](passes/GATE.md) confirms the source-backed findings and valid expected-failure evidence. Root corrected report citations, inspected browser assertion errors/screenshots and validated consolidated counts/links.

See [FINDINGS.md](FINDINGS.md) for exact reproductions, expected/actual behavior, source/test/screenshot evidence and suggested fixes. Separate pass reports/logs: [Backend](passes/BACKEND.md), [Frontend](passes/FRONTEND.md), [UX](passes/UX.md). [SESSION-LOG.md](SESSION-LOG.md) includes failures, dead ends and UTC command outcomes. [Tooling guide](tools/README.md) records local-only reproduction.

## Changes and limits

Product behavior is unchanged. Changes consist of nine new Vitest test files, test-only web JSX coverage config, mobile renderer devDependencies/lock entries, browser test/config/helpers, and QA docs/evidence. No trivial product one-liner was applied. No environment files, migrations, deployment configuration or scan-ignore baselines were edited.

Not tested: production/live Supabase or database/RLS behavior; native iOS/Android builds/devices, physical secure storage or audible quality; full screen-reader output; full Firefox/WebKit workflow parity; real fonts, production performance/CDN or sustained load; live dependency advisories; exact CI Node20 runtime. Real services are prohibited by scope, native hardware is unavailable, and the CI Node package install was blocked/unavailable. Local validation used Node26.7.0. Frontend/UI unit coverage remains low despite browser evidence. Hosted CI stays pending until the orchestrator opens the draft PR.

The orchestrator's next step is to review this uncommitted diff, scan it, commit/push the QA branch, open the single draft PR, and attach the actual CI state. No merge or deployment is part of this handoff.

Fix pass: see FIXES.md
