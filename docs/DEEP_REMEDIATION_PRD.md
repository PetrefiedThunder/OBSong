# TopoSonics Deep Remediation PRD

Date: 2026-05-01
Status: Draft for implementation planning
Scope: Bug hunt, technical debt remediation, release hardening, and quality gates

## Executive Summary

An 18-team senior engineering review found no new P0 production-stop issue, but it did find multiple P1 risks that should be treated as release blockers before wider production use:

- Composition persistence is under-specified: API routes accept loosely validated JSON, cast database JSON back to `Composition`, and rely on route checks instead of checked-in Supabase migrations/RLS policies.
- Media is coupled to composition JSON: mobile saves full base64 image data into composition payloads, causing API body-limit, database bloat, cache, privacy, and performance risk.
- Playback timing is inconsistent: shared `NoteEvent` fields are ambiguous, web schedules them as seconds while UI/MIDI treat them as beats, and mobile ignores `start` entirely.
- Android native image processing can fail or stress devices: full-size bitmap decode occurs before downsampling, Expo module options may not convert reliably, temp files are not cleaned up, and docs still mention an unused OpenCV path.
- Release and supply-chain posture is not production-ready: Android release builds are debug-signed/version-locked, mobile native builds are not CI-gated, CodeQL is manual/under-scoped, and `corepack pnpm audit --prod --json` reports 54 production advisories.
- Critical user flows have weak automated coverage: API auth/ownership, mobile native generation, web save/replay, contracts, accessibility, and release signing are mostly manual.

This PRD turns the review into a sequenced remediation program with clear requirements, acceptance criteria, and PR boundaries.

## Review Method

The user requested 18 senior engineering teams. The runtime allowed six concurrent subagents, so the review ran in three waves:

1. API/auth/security, web auth/data flow, mobile auth/session/cache, Android native image processing, iOS native/release parity, core image algorithms.
2. Core audio algorithms, web audio runtime, mobile audio runtime, type contracts/runtime validation, CI/CD/release engineering, dependency/supply-chain security.
3. Frontend UX/accessibility, data model/persistence, performance/memory, testing/quality gates, documentation/operations, architecture synthesis.

Local verification and evidence collected during the review:

- `corepack pnpm --filter @toposonics/core-image test -- --run`: passed.
- `corepack pnpm --filter @toposonics/core-audio test -- --run`: passed.
- Prior branch verification already had `corepack pnpm -r --if-present typecheck`, `corepack pnpm lint`, `corepack pnpm test`, `corepack pnpm build`, Android native Kotlin compile, and Android debug assemble passing.
- `corepack pnpm audit --prod --json`: failed with 54 production advisories: 1 critical, 35 high, 16 moderate, 2 low.
- Final architecture review reported `corepack pnpm typecheck`, `corepack pnpm test`, and `corepack pnpm lint` passing, with the caveat that several packages still have placeholder "no tests" scripts.

## Goals

- Preserve user privacy and ownership boundaries for all saved compositions.
- Make composition data schema-versioned, validated, bounded, and migration-friendly.
- Make web, mobile, and MIDI playback agree on note timing.
- Make mobile image generation reliable for realistic camera/gallery images.
- Establish production-grade release signing, dependency scanning, and CI gates.
- Improve accessibility and user trust on auth, library, playback, and startup flows.
- Convert stale docs/runbooks into operationally useful guidance.

## Non-Goals

- Rebuilding the whole product.
- Shipping full iOS native image generation in this remediation phase. iOS parity can be planned after Android and shared contracts are stable.
- Implementing the full native audio engine spec immediately. The near-term goal is correct scheduling/lifecycle behavior; the native synth can remain a later epic.
- Replacing Supabase. The goal is to make the current Supabase architecture explicit, versioned, and safer.

## Severity Definitions

- P0: Current behavior can prevent core product use or cause severe data/security failure immediately.
- P1: Release blocker or high-risk correctness/security/privacy issue that should be fixed before production expansion.
- P2: Important reliability, scale, accessibility, or maintainability issue that should be scheduled soon.
- P3: Cleanup, docs, polish, or future-proofing issue.

## Ranked Findings

### P1: Composition Data Boundary Is Not Safe Enough

Evidence:

- `apps/api/src/routes/compositions.ts` only checks a few truthy fields before accepting create bodies.
- `apps/api/src/services/compositions.ts` casts `row.data` to `Composition` and spreads it into API responses.
- `packages/types/src/schemas.ts` only contains image-analysis and note-event schemas, not persisted composition schemas.
- No checked-in Supabase migrations, RLS policies, or storage policies were found.

Impact:

- Invalid or oversized compositions can be stored and later crash clients.
- Ownership depends on application code while the API uses a service-role client.
- A clean Supabase project cannot be reconstructed from repo state.

### P1: Full Source Images Are Stored Inline

Evidence:

- `apps/mobile/src/screens/EditorScreen.tsx` reads selected images as base64 and saves `imageData`.
- `packages/types/src/composition.ts` allows full `imageData`.
- `apps/api/src/server.ts` caps request bodies at 10 MB.
- `apps/api/src/services/compositions.ts` stores the full composition object in JSON.

Impact:

- Normal camera photos can exceed API limits once base64/JSON overhead is included.
- Composition lists and mobile caches can become huge.
- Privacy/retention/deletion semantics for source images are unclear.

### P1: Playback Timing Diverges Across Platforms

Evidence:

- `packages/types/src/audio.ts` says note `start` and `duration` may be seconds or beats.
- `apps/web/src/hooks/useToneEngine.ts` passes numeric `start`/`duration` to Tone, which treats them as seconds, while the stop timer converts beats to seconds.
- `apps/mobile/src/services/audioPlayer.ts` plays events sequentially and ignores `event.start`.
- MIDI export and UI duration math treat note timing as beats.

Impact:

- Tempo changes can cut off web playback.
- Web multi-voice compositions replay incorrectly on mobile.
- Saved compositions do not have a single reproducible timing contract.

### P1: Native Mobile Image Processing Can OOM Or Fail

Evidence:

- `packages/native-image-processing/android/src/main/java/com/toposonics/nativeimageprocessing/NativeImageProcessingModule.kt` decodes the full bitmap before resizing.
- `ImageProcessingOptions` is a plain Kotlin data class, which may not be the correct Expo Modules conversion shape.
- `content://` image copies are not cleaned after decode/failure.
- Native package still includes C++/OpenCV files and docs mention OpenCV, while Gradle does not wire that path.
- `apps/mobile/android/gradle.properties` currently pins a local Homebrew JDK path.

Impact:

- Large photos can crash or stall Android generation.
- Fresh developer/CI machines may fail due to local Java path assumptions.
- Native implementation ownership is unclear.

### P1: Release And Supply Chain Are Not Gated

Evidence:

- `apps/mobile/android/app/build.gradle` release builds use debug signing and fixed `versionCode 1` / `versionName "0.1.0"`.
- `apps/mobile/package.json` build script does not compile native projects in CI.
- `.github/workflows/codeql.yml` is manual and JS/TS-only.
- `.github/workflows/crda.yml` uses `pull_request_target`, secrets, and `crda: latest`.
- `package.json` pins `node-forge` to `1.3.1` while audit recommends `1.4.0`.
- `corepack pnpm audit --prod --json` reports 54 production advisories.

Impact:

- Green CI can merge broken native release builds.
- Store-ready Android artifacts are not guaranteed.
- Dependency and code scanning do not reliably cover PR changes or native surfaces.

### P1: API Auth/Ownership Has No Automated Tests

Evidence:

- `apps/api/package.json` test script is a placeholder.
- API routes enforce private library access, ownership checks, create/update/delete, and error behavior.
- Existing root tests pass despite no API route assertions.

Impact:

- Ownership regressions can ship green.
- Security-critical behavior is manual and brittle.

### P1: Core Image Has Hidden Correctness Bugs

Evidence from review:

- `packages/core-image/src/depth.ts` spreads large edge arrays into `Math.max`, which can throw `RangeError`.
- Small images can produce `NaN` profiles due to unclamped row sampling.
- Texture normalization cannot reach "high" thresholds because valid brightness standard deviation maxes near 127.5.
- Ridge strengths saturate before normalization.

Impact:

- Normal-size depth-ridge analysis can fail.
- Tests pass because they mostly assert shape/length, not finite/range correctness.

### P1: Web Library/Auth UX Has Accessibility Defects

Evidence:

- `apps/web/src/app/compositions/page.tsx` wraps cards in `Link` while the child card is also role/button-like.
- `apps/web/src/components/LoginModal.tsx` is not a proper dialog: no `role="dialog"`, `aria-modal`, focus trap, Escape handling, or focus restoration.

Impact:

- Keyboard and screen-reader users can get broken navigation or lose context in auth/save flows.
- Accessibility regressions are not currently CI-gated.

## Epics And Requirements

### Epic 1: Contracted Composition Persistence

Requirement:
Saved compositions must be schema-versioned and runtime-validated at API boundaries and on database read.

Implementation requirements:

- Add Zod schemas in `packages/types` for:
  - `NoteEvent`
  - `CompositionPayload`
  - `CompositionSummary`
  - `CreateCompositionRequest`
  - `UpdateCompositionRequest`
  - `AuthLoginRequest`
  - `ApiSuccess`
  - `ApiError`
- Decide wire date policy: DTO dates are ISO strings, or shared client hydrates them into `Date`. The current `Date` type does not match raw JSON.
- Add `schemaVersion` to persisted composition data.
- Reject unknown protected fields on create/update: `id`, `userId`, `createdAt`, `updatedAt`.
- Validate note count, note format, numeric ranges, tempo range, title/description length, mapping mode, key, scale, preset id, metadata size, and effect ranges.
- Validate `compositions.data` on read and handle corrupt rows with a typed compatibility error or repair path.
- Make every composition service method require `userId` and constrain queries/mutations with both `id` and `user_id`.

Acceptance criteria:

- Invalid create/update payloads return `400 INVALID_INPUT` with field-level details.
- Valid web and mobile save payloads still return `201` and round-trip through list/detail.
- Corrupt stored rows cannot crash list/detail screens.
- Cross-user read/update/delete tests fail closed.
- DTO runtime values match TypeScript types.

### Epic 2: Supabase Migrations, RLS, And Media Storage

Requirement:
A clean Supabase project must be bootstrappable from repo migrations, with data ownership enforced at the database/storage layer.

Implementation requirements:

- Add checked-in Supabase migrations for `compositions`.
- Enable RLS on `compositions`.
- Add select/insert/update/delete policies scoped to `auth.uid()`.
- Add indexes for `(user_id, created_at desc, id desc)` and primary lookup.
- Add private Supabase Storage bucket or equivalent asset storage for source images/thumbnails.
- Replace inline full-resolution `imageData` with bounded thumbnail/asset metadata:
  - object path
  - dimensions
  - MIME type
  - checksum
  - byte size
  - thumbnail path or small thumbnail data under a strict cap
- Delete or orphan-clean assets when compositions are deleted.

Acceptance criteria:

- A fresh Supabase environment can apply repo migrations successfully.
- Anonymous users cannot read/write composition rows or image objects.
- A user cannot access another user's composition via API or direct Supabase client.
- Mobile save stores image bytes outside `compositions.data`.
- Deleting a composition also cleans associated remote assets or schedules cleanup.

### Epic 3: Paginated Library And Cache Lifecycle

Requirement:
Library list views must be lightweight, paginated, and cache-safe.

Implementation requirements:

- Add `GET /compositions?limit=&cursor=` with stable sort `created_at desc, id desc`.
- Return `CompositionSummary[]` for lists, excluding full note arrays and image data.
- Fetch full composition only on detail.
- Add mobile cache TTL, schema version, user scope, and purge on sign-out/account switch.
- Hydrate offline detail from list cache when detail cache is missing.
- Add cache invalidation on update/delete.

Acceptance criteria:

- First page response for 1,000 saved compositions remains under an agreed budget, initially 250 KB.
- Offline list-to-detail works for cached summaries/details according to product policy.
- Private cached data is cleared on sign-out/account switch.
- Stale cache is visibly marked or refreshed.

### Epic 4: Unified Timing And Playback Parity

Requirement:
The same saved composition must produce the same event schedule in web playback, mobile preview, and MIDI export within documented tolerance.

Implementation requirements:

- Replace ambiguous `start`/`duration` docs with a single contract:
  - preferred: `startBeats` and `durationBeats`, or
  - explicit `timeUnit: "beats"` on composition schema.
- Update core audio mappers to emit the chosen contract.
- Update web Tone scheduling to convert beats to Tone transport time correctly.
- Update web stop timer and visual cursor to use the same duration helper.
- Update mobile playback to schedule by absolute start, support overlapping notes, and expose `play`, `stop`, and cleanup lifecycle.
- Add shared duration helper: `max(start + duration)`, not sum of durations.
- Make demo playback timers cancellable and isolated from Studio/detail playback.

Acceptance criteria:

- 60/90/180 BPM fixtures complete all notes without early stop.
- Chords and multi-voice overlapping events play concurrently on mobile.
- Mobile and web duration for the same fixture match within 100 ms after conversion.
- Navigating away or backgrounding mobile stops/pauses playback according to product policy.
- No stale playback callback mutates unmounted screens.

### Epic 5: Deterministic Generation And Core Algorithm Correctness

Requirement:
Image-to-audio generation must be deterministic, finite, range-bounded, and faithful to selected presets.

Implementation requirements:

- Fix `core-image` Sobel normalization without spreading large arrays into `Math.max`.
- Clamp row sampling for tiny images and assert finite output.
- Correct texture normalization so high texture is reachable.
- Preserve relative ridge strengths instead of pre-normalization saturation.
- Make `mapTextureToPad` deterministic; remove raw `Math.random()` or seed it.
- Apply `TopoPreset` voice settings and mapping bias in `mapImageToMultiVoiceComposition`, or hide/remove unused fields until implemented.
- Fix `mapDepthRidge` `maxNotes` behavior so it downsamples across the full profile instead of cropping the left side.
- Use the same sampled source index for all per-column features.

Acceptance criteria:

- 1 px, 3 px, 12 MP, and malformed-pixel fixtures return finite bounded outputs or typed validation errors.
- Same image bytes/settings/seed produce deep-equal `NoteEvent[]`.
- Built-in scene presets produce measurable differences for fixed analysis fixtures.
- Right-edge ridges can generate notes when `profile.length > maxNotes`.
- Core image/audio tests assert ranges, finite values, and golden outputs.

### Epic 6: Native Image Processing Reliability

Requirement:
Android image generation must handle realistic Expo ImagePicker URIs and large images without OOM, stale temp files, or unclear implementation paths.

Implementation requirements:

- Use Expo Modules-supported option conversion for `ImageProcessingOptions`.
- Decode with bounds and `inSampleSize` before allocating full bitmaps.
- Apply EXIF orientation when available.
- Reject unsupported schemes with clear errors.
- Clean temp cache files in success and failure paths.
- Add max input pixels/bytes policy.
- Remove unused C++/OpenCV files and setup docs, or wire the C++ path intentionally with Gradle/CMake and tests.
- Remove machine-specific `org.gradle.java.home` from committed Gradle config; move local Java guidance to docs/scripts.
- Stop requesting `includeRidgeStrength` for linear generation when unused.

Acceptance criteria:

- `file://` and `content://` gallery/camera images process successfully.
- 12 MP, 24 MP, and 48 MP fixtures process under defined memory budgets on target Android devices.
- Temp files are removed after success/failure.
- Unsupported URI schemes produce user-safe typed errors.
- Android native module compile/build runs in CI.

### Epic 7: API And Edge Security Hardening

Requirement:
API security behavior must fail closed and not depend on broad defaults.

Implementation requirements:

- Keep CORS exact-origin matching and make production origins explicit.
- Remove localhost/dev CORS defaults in production unless explicitly configured.
- Make trusted proxy topology explicit: false by default, configured hop count/CIDR in production.
- Validate canonical hosts for HTTPS redirects or delegate redirects to the edge.
- Return generic 5xx messages in production with correlation IDs; only allowlisted 4xx messages are client-readable.
- Add per-IP and per-token-hash throttles for `/auth/login`.
- Add max token length.
- Reduce public detailed health output or gate it internally.

Acceptance criteria:

- Spoofed `X-Forwarded-For`, `X-Forwarded-Proto`, and hostile `Host` cases are tested.
- Production startup fails if required CORS/proxy settings are missing.
- Unexpected server errors do not expose internals.
- Auth abuse tests verify tighter throttling and safe responses.

### Epic 8: Release, CI, And Supply Chain

Requirement:
PR and release gates must cover shipped code, native builds, secrets, and dependencies.

Implementation requirements:

- Configure Android release signing with non-committed keystore or managed EAS credentials.
- Source versionCode/versionName/buildNumber from one release input.
- Split mobile release checks by phase: build prerequisites vs submit credentials.
- Add Android release-equivalent Gradle build to CI or scheduled release gate.
- Add iOS archive/smoke gate on macOS where feasible.
- Make CodeQL run on PR/push and cover JS/TS, GitHub Actions, Java/Kotlin, C/C++, and Swift where buildable.
- Replace unsafe CRDA `pull_request_target` secret pattern or ensure no secrets are available to untrusted PR code.
- Pin third-party GitHub Actions and scanner/CLI versions.
- Add Dependabot/Renovate or equivalent dependency update automation.
- Add SBOM generation and artifact checksums for releases.
- Add secret hygiene to `.gitignore`: `apps/mobile/credentials/`, keystores, `.jks`, `.p12`, `.p8`, local Xcode env files.
- Resolve or document time-boxed exceptions for production audit advisories.

Acceptance criteria:

- Android release builds fail if release signing is missing and never use debug signing.
- `corepack pnpm audit --prod` passes or only reports approved, time-boxed exceptions.
- CodeQL/security scan failures block release branches.
- CI compiles or smoke-tests native mobile release surfaces.
- Release artifacts include commit SHA, environment, checksums, and provenance notes.

### Epic 9: Product Accessibility And Trust

Requirement:
Auth, library, controls, playback, and startup flows must be accessible and honest about platform availability.

Implementation requirements:

- Make web auth modal a proper dialog with focus trap, initial focus, Escape handling, title/description, background inertness, and focus restoration.
- Fix composition card nested interactions so each card has one accessible target.
- Add accessible fallback/summary for timeline canvas.
- Model mapping/key/scale choices as radio groups or equivalent selected-state controls.
- Add mobile startup loading state instead of returning `null`.
- Show iOS users that generation is unavailable before they enter the create flow.
- Replace mobile custom Apple Sign-In button with native `AppleAuthenticationButton`.
- Add Apple nonce/state handling.

Acceptance criteria:

- Axe tests pass for auth modal and library card interactions.
- Keyboard users can open/close auth and navigate composition cards reliably.
- Screen-reader users can inspect note count/range/duration and playback progress.
- iOS create flow clearly explains unsupported generation before commitment.
- App startup always renders an accessible loading/error state.

### Epic 10: Documentation And Operations

Requirement:
Docs must match the current architecture and provide actionable runbooks.

Implementation requirements:

- Update Android setup docs to describe the actual native image implementation.
- Mark OpenCV/CMake scripts as legacy/future or remove them if unused.
- Fix README quick start so long-running API/web dev commands are in separate terminals or a parallel script.
- Update `CONTRIBUTING.md` roadmap to remove stale Prisma/auth/native TODOs and reflect Supabase/current product state.
- Add operations runbook:
  - liveness/readiness/status endpoints
  - pressure thresholds
  - alert criteria
  - log queries
  - incident severity
  - escalation
  - rollback
  - post-incident review
- Document release phase gates: build, archive, submit.

Acceptance criteria:

- A new developer can follow README/Android docs without hitting stale OpenCV or blocking command issues.
- Release docs clearly distinguish local/internal artifacts from store-ready artifacts.
- Operations docs include response steps for API degradation, auth outage, high memory, high 5xx, and mobile release rollback.

## Proposed PR Sequence

PR 1: Composition schema and API validation

- Add schemas, DTO date policy, create/update validation, read-side validation, service methods scoped by `userId`.
- Add Fastify route tests for auth/ownership/contracts.

PR 2: Supabase migrations and RLS

- Add migrations, policies, indexes, and bootstrap docs.
- Add direct Supabase policy tests where possible.

PR 3: Media storage and library pagination

- Move images out of composition JSON, add storage contract, paginated summaries, cache lifecycle.

PR 4: Timing contract and playback parity

- Normalize note timing, update web/Tone, mobile scheduler, MIDI, shared duration helper, lifecycle cleanup.

PR 5: Core image/audio correctness

- Fix Sobel/tiny image/texture/ridge issues, deterministic pad mapping, TopoPreset application, golden tests.

PR 6: Android native image reliability

- Downsample before decode, Expo option conversion, temp cleanup, EXIF, URI errors, remove/wire OpenCV path, CI native build.

PR 7: Release and supply chain hardening

- Release signing/versioning, audit remediation, CodeQL/CRDA fixes, action pinning, secret ignores, SBOM/provenance.

PR 8: Accessibility and trust

- Auth dialog, composition cards, timeline fallback, selected controls, mobile startup, iOS availability, Apple Sign-In compliance.

PR 9: Docs and operations

- Android docs, README, contributing roadmap, release runbooks, observability runbook.

PR 10: E2E and quality gates

- Playwright studio/save/replay, mobile smoke tests, native module verification, CI coverage thresholds, flake policy.

## Quality Gates

Minimum gates before calling this remediation done:

- `corepack pnpm typecheck`
- `corepack pnpm lint`
- `corepack pnpm test`
- API contract/integration tests with mocked Supabase.
- Core image/audio golden and edge-case tests.
- Web component/accessibility tests for auth modal, library cards, mapping controls, playback controls.
- Playwright smoke for upload/generate/play/save/list/detail/export.
- Android Gradle build or module verification in CI.
- Mobile cache/auth/playback unit tests.
- Dependency audit gate with documented exceptions only.
- CodeQL/security scan gate for configured languages.
- Release signing dry-run or EAS credentials validation.

## Success Metrics

- 0 P1 findings remain open without explicit deferral.
- 0 critical/high production audit advisories remain without approved exception.
- API composition endpoints have negative tests for auth, ownership, malformed payloads, oversized payloads, and corrupt stored rows.
- Library first-page payload stays under 250 KB with 1,000 saved compositions in test data.
- 12 MP Android image generation completes within the target memory/time budget.
- Web/mobile/MIDI playback fixtures agree on duration and schedule within documented tolerance.
- Accessibility checks pass for auth/library/studio critical flows.
- Android release build cannot use debug signing.

## Open Decisions

- Choose the timing contract naming: keep `start`/`duration` with `timeUnit: "beats"`, or migrate to `startBeats`/`durationBeats`.
- Decide whether full source images should be uploaded to private storage, kept local-only, or optional by user setting.
- Decide whether to keep the OpenCV/C++ path as a future implementation or remove it now.
- Pick the mobile E2E runner: Maestro, Detox, or a lighter emulator smoke test.
- Decide whether CodeQL native language coverage is practical on every PR or split into PR plus scheduled release gates.

## Immediate Next Steps

1. Start PR 1 and PR 2 together only if owners can keep write scopes separate: contracts/API validation vs Supabase migrations/RLS.
2. Create a small fixture set for timing, composition payloads, and image edge cases before changing behavior.
3. Open explicit tracking issues for each epic and attach this PRD.
4. Treat release signing and audit failures as release blockers, not cleanup.
5. Keep PRs small enough that security, mobile, and product reviewers can reason about each boundary independently.
