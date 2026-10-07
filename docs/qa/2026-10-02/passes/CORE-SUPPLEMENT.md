# Backend QA — shared core supplement

## Charter and scope

UTC 2026-10-03T01:23:50Z through 2026-10-03T01:25:19Z (bounded supplemental session; the command logs carry authoritative per-command UTC timestamps). Investigate whether valid images and valid musical settings remain finite, bounded and deterministic, and whether MIDI export preserves musical timing and tracks. This is part of Backend QA, not an additional QA group.

Methods: reproducible seeded property corpus and equivalence classes for small/large images, bounds and all supported key/scale combinations, plus decode round-trip checks through the installed MIDI parser. These pure functions merit many low-cost unit/property cases. No API/auth/concurrency checks apply to this isolated synchronous layer. No production, network, credentials, databases or environment files were accessed.

Repository verified: OBSong origin PetrefiedThunder/OBSong, branch qa/2026-10-02-sweep, worktree /Users/sellers/Projects/qa-sweep-2026-10-02/OBSong. Only two new QA test files and this report were authored by this lane.

## Results

- Image suite: 37 passed (18 new tests), covering all three analyzers on 11 dimensions from 1×1 through 640×480, profile caps 1/2/7/128/256, black/white fields, finite outputs and documented profile bounds, pixel-buffer nonmutation.
- Audio suite: 62 passed, 1 expected failure (31 new tests: 30 pass plus BE-101). Corpus covers all 17 scales × 12 keys × 3 mapping modes, all 6 shipped Topo presets, note/velocity/effect/pan bounds, voice enablement, deterministic output and input nonmutation.
- MIDI: round-trip tests at 40/90/120/240 BPM preserve track names, MIDI pitches 0 and 127, note counts, beat start/duration within one tick, and velocity within MIDI quantization; composition tempo override and empty-export error checked.
- Both packages pass TypeScript checks.
- BE-101 also failed as a normal test during the negative-control run (one failure, assertion that the changed final texture sample should alter output). The expected-failure marker was restored afterward.
- No product behavior changed.

## Finding

| ID | Severity | Group | Title | Exact reproduction | Expected vs actual | Evidence | Suggested fix |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BE-101 | Medium | Backend | Pad mapper discards trailing texture samples | Call mapTextureToPad([0,0,0,0,0,0,0], 'C', 'C_MAJOR', {segments:6}); call again with only the final value changed to 1; compare output. Or run the BE-101 case in packages/core-audio/src/__tests__/qa-invariants.test.ts. | All horizontal source regions should influence the pad. Actual: both calls return identical 12-note arrays because floor(length/segments)×segments covers only indices 0–5. With the normal 128-sample profile and 6 segments, the last 2 samples are discarded. | packages/core-audio/src/mappers.ts:545–554; packages/core-audio/src/__tests__/qa-invariants.test.ts:94–98; [negative control](../artifacts/backend-core-pad-negative-control.txt) | Use proportional boundaries floor(i×length/count) and floor((i+1)×length/count), or include the remainder in the last segment; then remove it.fails after the test passes. |

## Comparable coverage

Coverage scope for both runs: V8, include src/**/*.ts, exclude src/**/__tests__/**; same package configurations and report settings. Unloaded barrel files have no executable lines. V8 branch denominators may grow when a previously uncovered module is executed.

| Package | Statements before → after | Branches before → after | Functions before → after | Lines before → after |
| --- | --- | --- | --- | --- |
| core-image | 92.77% → 94.29% | 82.47% → 87.62% | 96.87% → 96.87% | 92.44% → 94.22% |
| core-audio | 78.27% → 89.65% | 76.39% → 85.09% | 58.13% → 79.06% | 79.69% → 92.1% |

MIDI line coverage increased from 0% to 96.96%; remaining uncovered line 18 is the equal-start duration sort tie-break. Preset/scene lookup helper functions, invalid runtime inputs outside typed valid-value contracts, all image content distributions, arbitrary caller-supplied preset ranges, hardware/browser audio rendering, and subjective auditory fidelity remain untested by this supplement. The suite does not establish audio quality or universal fuzz completeness.

## Evidence and command accounting

All commands used the logged runner and appear in [Backend log](BACKEND-LOG.md) and the root SESSION-LOG.md. Per-command artifacts:

- [Identity and worktree](../artifacts/backend-core-identity.txt)
- [Initial source read including nonexistent-file dead end](../artifacts/backend-core-source.txt) — exit 1: analysis.ts does not exist; subsequent reads used real files.
- [Source contracts](../artifacts/backend-core-contracts.txt)
- [Focused contracts](../artifacts/backend-core-focused-contracts.txt)
- [Test creation](../artifacts/backend-core-add-tests.txt)
- [Image tests and coverage](../artifacts/backend-core-image-after.txt)
- [Audio tests and coverage](../artifacts/backend-core-audio-after.txt)
- [Source line and baseline evidence](../artifacts/backend-core-evidence.txt)
- [Negative control](../artifacts/backend-core-pad-negative-control.txt)
- [Package typechecks](../artifacts/backend-core-types.txt)

Coverage JSON: [image before](../artifacts/core-image-before/coverage-summary.json), [image after](../artifacts/core-image-after/coverage-summary.json), [audio before](../artifacts/core-audio-before/coverage-summary.json), [audio after](../artifacts/core-audio-after/coverage-summary.json).

PR: opened by orchestrator
CI status: pending at time of writing
