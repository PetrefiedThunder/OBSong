#!/usr/bin/env python3
"""Compile comparable coverage and reviewed finding tables from pass evidence."""
from collections import Counter
import json
from pathlib import Path
import re

qa = Path(__file__).resolve().parents[1]
rows = [
    ('API', 'backend-coverage-before', 'backend-coverage-after'),
    ('Core image', 'core-image-before', 'core-image-after'),
    ('Core audio', 'core-audio-before', 'core-audio-after'),
    ('Web', 'coverage-web-before-oxc', 'coverage-web-after'),
    ('Mobile', 'coverage-mobile-before', 'coverage-mobile-after'),
]
for name in ['shared', 'types', 'ui', 'native-image-processing']:
    rows.append((name, f'coverage-{name}-unchanged', f'coverage-{name}-unchanged'))
text = '''# Coverage and validation

PR: opened by orchestrator

CI status: pending at time of writing

## Comparable V8 coverage

Vitest and V8 provider are 4.1.11. Application scope includes all `src/**/*.{ts,tsx}`; API/core use `src/**/*.ts`. Tests are excluded from instrumentation. Before excludes newly added QA tests; after includes them. Production source is unchanged. Four packages received no added tests: their original-suite measurement is therefore both before and after. All nine workspace suites were measured. Type-only modules with zero executable lines are N/A, not a runtime coverage failure.

Percentages preserve identical per-package source and executable-line denominators. Expected-failure tests execute product code and contribute coverage. Coverage measures execution, not correctness. Browser scripts are not instrumented and are excluded from these numbers.

| Surface | Source files | Lines covered before → after | Statements % before → after | Branches % before → after | Functions % before → after | Raw reports |
| --- | ---: | --- | --- | --- | --- | --- |
'''
for name, before_dir, after_dir in rows:
    before = json.loads((qa / 'artifacts' / before_dir / 'coverage-summary.json').read_text())
    after = json.loads((qa / 'artifacts' / after_dir / 'coverage-summary.json').read_text())
    bt, at = before['total'], after['total']
    def pct(metric):
        return 'N/A' if bt[metric]['total'] == 0 else f"{bt[metric]['pct']} → {at[metric]['pct']}"
    left, right = bt['lines'], at['lines']
    lines = 'N/A (0 executable lines)' if left['total'] == 0 else (
        f"{left['covered']}/{left['total']} ({left['pct']}%) → "
        f"{right['covered']}/{right['total']} ({right['pct']}%)")
    text += (f"| {name} | {len(after)-1} | {lines} | {pct('statements')} | {pct('branches')} | "
             f"{pct('functions')} | [Before](artifacts/{before_dir}/coverage-summary.json), "
             f"[after](artifacts/{after_dir}/coverage-summary.json) |\n")
text += '''
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
'''
(qa / 'COVERAGE.md').write_text(text)

findings = []
for name in ['BACKEND.md', 'CORE-SUPPLEMENT.md', 'FRONTEND.md', 'UX.md']:
    for line in (qa / 'passes' / name).read_text().splitlines():
        if re.match(r'^\| (BE|FE|UX)-\d+ \|', line):
            line = line.replace('(../artifacts/', '(artifacts/')
            line = re.sub(r'(?<![/\w-])(ux-[\w-]+\.(?:json|png|txt))',
                          r'[\1](artifacts/\1)', line)
            findings.append(line)
severity = Counter(line.split('|')[2].strip() for line in findings)
group = Counter(line.split('|')[3].strip() for line in findings)
header = '''# Findings

PR: opened by orchestrator

CI status: pending at time of writing

Confirmed findings only. Reproduction uses local fixtures or deterministic mocked providers. No product fix was applied. Severity reflects the reproduced user impact and necessary conditions; a configuration-dependent risk is not a claim about production settings. All source paths are relative to the repository root. Tests marked `it.fails` or `test.fail` preserve known defects without making the ordinary suite red.

| ID | Severity | Group | Title | Exact reproduction | Expected vs actual | Evidence | Suggested fix |
| --- | --- | --- | --- | --- | --- | --- | --- |
'''
(qa / 'FINDINGS.md').write_text(header + '\n'.join(findings) + '\n')
print('Consolidated', len(findings), 'findings:', dict(severity), dict(group))
