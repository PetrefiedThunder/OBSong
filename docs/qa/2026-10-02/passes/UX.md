# UX QA pass

PR: opened by orchestrator
CI status: pending at time of writing

Counts: Critical=0 High=0 Medium=5 Low=1

Identity verified before edits: OBSong, `/Users/sellers/Projects/qa-sweep-2026-10-02/OBSong`, branch `qa/2026-10-02-sweep`, origin `PetrefiedThunder/OBSong`. No product behavior changed.

## Charter, scope and method

The 20-minute browser exploration budget focused on the highest-impact user journey: discover the studio, upload a local synthetic image, generate notes, play/stop, export MIDI, sign in with a fake provider, save to a fake API, open/edit a composition, and recover from errors. Source review preceded execution. Separate anonymous and authenticated contexts prevented state leakage.

Axe WCAG 2.2 AA tags, manual keyboard traversal, DOM/ARIA snapshots, desktop/narrow-mobile screenshots, and Nielsen heuristics were combined because automated accessibility rules do not detect focus escape or missing selection state reliably. A small persistent Playwright regression suite covers observable invariants. Browser-only performance timings complement the production build evidence; they are not a Lighthouse score or production performance claim.

Every browser request was intercepted before navigation. Only the local Next origin was allowed; localhost 3998/3999 API/auth responses were synthetic fixtures, and all other origins were aborted. Fake public config was supplied by the root agent without environment-file edits. Browser scripts connected to the orchestrator endpoint; no browser was launched or installed. A local font mock uses Arial, so real Inter loading and network cost were not tested.

## Timed sessions and logs

All shell commands and UTC outcomes are in [UX-LOG.md](UX-LOG.md) and [SESSION-LOG.md](../SESSION-LOG.md). Step-level UTC times are in the JSON reports. Session time is UTC on October 3; this is still October 2 in the repository's America/Los_Angeles timezone.

| Charter | Actual UTC session | Outcome |
|---|---|---|
| Anonymous discovery, keyboard, image boundaries, MIDI, responsive layout, axe | First connected run began 2026-10-03 01:26:00; focused recovery rerun 01:27:39–01:28:01 | Portrait bug reproduced, valid-image recovery succeeded, accessibility findings captured |
| Private library, invalid/valid sign-in, empty/loading/error/retry, save retry, detail/edit | 2026-10-03 01:26:05–01:26:10 | All synthetic auth/API workflows completed; missing sign-out and detail overflow observed |
| Local performance measurements | 2026-10-03 01:28:03–01:28:07 | Navigation, FCP/LCP, CLS, long tasks and transfer sizes captured |
| Persistent Chromium regressions | See ux-browser-regressions-final artifact UTC | 2 ordinary passing tests and 4 expected failures; Playwright reports “6 passed (13.7s)”, exit 0 |

A premature run against port 3000 was cancelled when root identified an environmental Next watcher/404 problem. The attempted `pkill` cleanup failed because sandbox process inventory is unavailable; Ctrl-C stopped the run. Root restored readiness on port 3138 with polling. These failures are logged and are not product findings. A relative reporter path initially nested its JSON under tools; the report was moved to artifacts and the config now uses an absolute path.

## Findings

| ID | Severity | Group | Title | Exact reproduction | Expected versus actual | Evidence | Suggested fix |
|---|---|---|---|---|---|---|---|
| UX-001 | Medium | UX | Dialog keyboard focus escapes and is not restored | Open `/compositions`, choose Sign In; from Email press Tab four times. Press Escape after focus reaches a background link. On the landing page choose Try Demo and inspect initial focus. | Expected: focus enters/stays in the dialog and returns to its trigger on close. Actual: login focus exits after Sign In; Escape leaves focus on the logo; landing demo never receives focus. | `apps/web/src/components/LoginModal.tsx:33-42`; `apps/web/src/components/LandingDemoPlayer.tsx:185`; ux-browser-report.json keyboard steps; expected-failure test UX-001; ux-login-modal.png | Add a shared accessible dialog implementation with focus containment, inert background, initial focus and trigger restoration. |
| UX-002 | Medium | UX | Musical selection is conveyed only by color | On `/studio`, select key D and inspect Key group accessibility snapshot; repeat for Mapping Mode and Scene Pack. | Expected: assistive technology exposes current selection. Actual: keys/modes/scenes are ordinary buttons with no pressed/checked/selected state; D's CSS changes but accessibility snapshot does not. | `apps/web/src/components/MappingControls.tsx:116-159`; `apps/web/src/components/ScenePackSelector.tsx:47-92`; ux-browser-report.json selection step; expected-failure test UX-002 | Use radios with labelled groups or `aria-pressed` on selection buttons; apply equivalent state to landing category filters. |
| UX-003 | Medium | UX | Main controls and the 404 page fail text contrast | Run axe on `/`, `/studio`, and `/does-not-exist`; inspect screenshots. | Expected: normal text at least 4.5:1 and large text 3:1. Actual: 13 home nodes fail; studio selected-mode caption is 1.61:1; demo buttons reach 1.8:1; default 404 headings are almost white on white at 1.04:1. | `apps/web/src/app/page.tsx:129-139,183-193`; `apps/web/src/components/MappingControls.tsx:125-136`; `apps/web/src/app/globals.css:33-40`; ux-browser-report.json axe nodes; ux-not-found.png; expected-failure test UX-003 | Choose foreground/background pairs meeting contrast and add a theme-compatible not-found page or scope global heading colors. |
| UX-004 | Medium | UX | Composition detail actions overflow mobile viewport | With stubbed auth/API, save a composition, open its detail, set 375×812 viewport; title “QA renamed composition” reproduces. | Expected: title/actions wrap within 375px and all actions remain reachable without horizontal scroll. Actual: document scroll width 466px; Delete sits outside the initial viewport. Home and studio fit at 375px; home also fit at 320px. | `apps/web/src/app/compositions/[id]/page.tsx:281-315`; ux-auth-report.json detail step; ux-detail-mobile-375.png | Stack header/action row on narrow viewports and allow button wrapping. |
| UX-005 | Medium | UX | Signed-in users have no way to sign out | Sign in using the stubbed login; inspect navigation, private library, studio and detail actions; search web source for logout consumers. | Expected: visible account/sign-out action ends the stored session. Actual: zero sign-out buttons/links; `logout` exists only in AuthContext and is unused. A later user of the same browser can inherit private-library access. | `apps/web/src/contexts/AuthContext.tsx:101-110`; `apps/web/src/app/layout.tsx:54-75`; ux-auth-report.json empty-library step; ux-auth-static.txt | Expose sign-out in shared navigation/account UI, invoke logout and return to anonymous state. Medium because this requires another person to access the same browser; remote exploitation was not demonstrated. |
| UX-006 | Low | UX | Studio “Play Demo” loads notes without playing | On `/studio` choose Ocean Horizon, click Play Demo, then inspect Play/Stop. | Expected: a control labelled Play Demo starts playback. Actual: notes populate and Save appears, but Play stays idle and Stop remains disabled; user must press a second Play button. | `apps/web/src/components/ScenePackSelector.tsx:20-33,110-125`; `apps/web/src/app/studio/page.tsx:235-248`; ux-auth-report.json demo step; expected-failure test UX-006 | Rename to “Load Demo” with a clear cue to press Play, or start playback using the original user gesture. |

## Frontend browser proof

[Browser report](../artifacts/ux-browser-report.json), [auth/API report](../artifacts/ux-auth-report.json), [regression results](../artifacts/ux-regression-results.json).

- **FE-001 confirmed in browser:** a valid synthetic 1301×2000 PNG triggers `RangeError: Invalid array length` in `computeAveragedBrightnessProfile`, alerts “Failed to analyze image”, and leaves Generate disabled. [Portrait failure screenshot](../artifacts/ux-portrait-analysis-failure.png). The exploratory script records this as an observed failure; the frontend unit regression marks the known defect expected-failure.
- Replacing it with a valid 640×480 image succeeds: Generate creates notes; Play enters Playing; Stop returns to idle; exported MIDI is 658 bytes and begins `MThd`. [Generated studio](../artifacts/ux-studio-generated.png), [MIDI artifact](../artifacts/ux-generated.mid). Audible quality was not evaluated.
- Stubbed invalid sign-in preserves the dialog and shows an error. Successful sign-in reaches the private empty library. Delayed list response shows loading; 503 shows an error and Retry recovers. Save 503 then success preserves the workflow; saved composition opens and edits successfully.
- Chromium 153.0.8010.12, Firefox 155.0, and WebKit 26.6 all passed local studio scene selection and demo-note loading. [Firefox screenshot](../artifacts/ux-studio-firefox.png), [WebKit screenshot](../artifacts/ux-studio-webkit.png). Only Chromium received the full workflow and axe pass.
- No unhandled page errors or unexpected failed network requests occurred in the anonymous run. Expected console errors correspond to the known portrait bug, deliberately corrupt image, deliberate 404, and mocked auth/API failures. An Autoprefixer development warning is recorded. No live external origins were contacted.

The general exploration helpers use “pass” to mean that a step completed and its observations were collected; an axe violation or semantic defect can still appear inside a completed step. Only the persistent regression suite uses assertions and expected-failure markers.

## Accessibility and manual review

Axe tags: `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`. No axe violations were detected for the login dialog, private empty library or saved detail fixture; this does not establish WCAG conformance. Home, landing demo, studio and 404 fail contrast as listed above. Underlying page nodes remain present in the landing-demo report, so its 19 contrast nodes are not 19 unique new defects.

Manual keyboard and semantics: field labels work, initial login focus reaches Email, Tab exposes UX-001, Escape closes both dialogs, and ARIA snapshot exposes UX-002. Native screen-reader speech, touch assistive technology, and physical keyboard/device behavior were not tested. The delayed library state has no live region; retain this as a follow-up screen-reader check rather than claiming it was announced.

Screenshots were visually inspected for desktop studio, 320px home, 375px detail and 404. The mobile detail screenshot confirms the clipped Delete action; 404 text is effectively invisible. Home and studio reflow within measured widths. Screenshot UI includes the Next development badge and mocked local font.

## Nielsen heuristic review

| Heuristic | Observation |
|---|---|
| Visibility of system status | Loading labels and disabled actions exist; library retry recovers. Live announcements need assistive-technology validation. |
| Match with real world | Studio step labels support the image-to-music workflow; UX-006 mislabels loading as playing. |
| User control and freedom | Cancel/Escape work; UX-001 focus management and UX-005 session exit remain defective. |
| Consistency and standards | Labels and field associations are mostly consistent; selected-state semantics are missing (UX-002). |
| Error prevention | Generate/Play are disabled before notes exist; corrupt image is rejected; fractional portrait dimensions break valid input (FE-001). |
| Recognition rather than recall | Current values and scene descriptions are visible; assistive technology cannot identify several current selections (UX-002). |
| Flexibility and efficiency | Scene presets, demos, tempo and MIDI export work; full keyboard modal operation is limited by UX-001. |
| Aesthetic and minimalist design | Main layouts are compact; contrast and narrow detail layout reduce readability (UX-003/004). |
| Help users recognize, diagnose, recover | Retry and save retry work; generic alerts provide little repair guidance; 404 feedback is unreadable (UX-003). |
| Help and documentation | Numbered studio steps and scene-specific guidance are present. Full first-time tour completion and README onboarding were not tested in this pass. |

## Bounded performance evidence

[Performance report](../artifacts/ux-performance.json), measured with a warmed local Next development server, Arial font mock, no CPU/network throttling and ~1 second post-network-idle observation. Values are diagnostic only; no Lighthouse score, field INP, production CDN or actual mobile hardware claim.

| Route | TTFB | FCP | LCP observed | CLS observed | Long task observed | Resource transfer |
|---|---:|---:|---:|---:|---:|---:|
| / | 23.9ms | 52ms | 52ms | 0 | 99ms | 2,641,387 bytes / 6 resources |
| /studio | 25.5ms | 44ms | 296ms | 0.0958 | 99ms | 3,096,058 bytes / 6 resources |

Production build size evidence belongs to the frontend pass. Dev bundles make these transfer sizes unsuitable for production budgets.

## Coverage and remaining limits

Before this pass: no repository browser/axe suite found. Added six persistent browser tests: two ordinary passes and four expected failures tied to UX IDs. Browser/source line coverage was not instrumented; do not infer a percentage from scenario counts. Test execution is documented separately from hosted CI, which is pending.

Not tested: actual auth/API provider integration, production credentials/data, native iOS/Android runtime and device assistive technology, audible fidelity, full Firefox/WebKit workflow parity, actual Inter font, real network throttling, full screen-reader sessions, and first-time tour completion. The stubbed API proves frontend state behavior, not backend security or persistence.
