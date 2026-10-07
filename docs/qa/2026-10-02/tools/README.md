# QA reproduction and artifact guide

Run from the repository root on the QA branch. These commands are recorded for reviewers; the QA agent already executed the checks. Never supply real credentials or a non-loopback application URL. All new source tests are included by the ordinary workspace suite; browser checks remain separate because the external browser-server endpoint is required.

## Workspace checks

Use Corepack pnpm 8.15.0. Install with `corepack pnpm install --frozen-lockfile --ignore-scripts --store-dir /private/tmp/obsong-qa-pnpm-store`. Build workspace libraries before typecheck/tests because packages use generated project-reference outputs. The existing CI already follows this ordering. No environment files are needed for the mocked tests.

Commands can be wrapped as `python3 docs/qa/2026-10-02/tools/run.py review LABEL 'COMMAND'`; use a unique LABEL to retain every output. The runner strips inherited service credentials, retains only basic OS variables and the browser endpoint, records UTC starts/outcomes, and writes one artifact per command. A nonzero exit is a failed command even if a later command in the session succeeds. Some exploratory shell batches end with a successful command despite earlier missing-file errors; those errors remain in their artifacts and pass narratives.

## Coverage/browser dependencies

The product lockfile only adds mobile test-renderer devDependencies. Temporary coverage/browser tools are outside the checkout:

```sh
mkdir -p /private/tmp/obsong-qa-tools
npm install --prefix /private/tmp/obsong-qa-tools --ignore-scripts --no-audit --no-fund @playwright/test@1.63.0 @axe-core/playwright@4.13.0 @vitest/coverage-v8@4.1.11
mkdir -p node_modules/@vitest
ln -s /private/tmp/obsong-qa-tools/node_modules/@vitest/coverage-v8 node_modules/@vitest/coverage-v8
```

The last symlink is only needed if the coverage provider is not already linked. Exact coverage CLI options and directory names are in SESSION-LOG.md. `consolidate.py` rebuilds FINDINGS.md/COVERAGE.md from preserved reports; SUMMARY.md remains an editorial review.

## Local web server

The Google font response is mocked with local Arial; this is a test-only hook, not product configuration. Use the following process environment with `corepack pnpm --filter @toposonics/web exec next dev --hostname 127.0.0.1 --port 3138`:

```sh
WATCHPACK_POLLING=true
NEXT_TELEMETRY_DISABLED=1
NEXT_FONT_GOOGLE_MOCKED_RESPONSES="$PWD/docs/qa/2026-10-02/tools/font-mock.cjs"
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3999
NEXT_PUBLIC_SUPABASE_ANON_KEY=qa-placeholder-public-key
NEXT_PUBLIC_API_URL=http://127.0.0.1:3998
```

These values are synthetic fixtures, not credentials. The browser scripts intercept localhost3998/3999; no API server or database is required. Supply the variables inline or export them in a temporary shell; do not create environment files. Polling avoids the observed macOS EMFILE watcher limit. Stop dev before running a production build against the same `.next` directory. The same mocked font/fake config was used with `corepack pnpm -r --sort --if-present build` for production build validation.

## Browser checks

Require the orchestrator-provided `PW_TEST_CONNECT_WS_ENDPOINT`; all scripts connect to it and never launch/install a browser. The tested endpoint served Chromium, Firefox and WebKit. Set `QA_BASE_URL=http://127.0.0.1:3138` and run:

```sh
node docs/qa/2026-10-02/tools/ux-browser.cjs
node docs/qa/2026-10-02/tools/ux-auth.cjs
node docs/qa/2026-10-02/tools/ux-perf.cjs
node /private/tmp/obsong-qa-tools/node_modules/@playwright/test/cli.js test --config docs/qa/2026-10-02/tools/ux-playwright.config.cjs
```

The exploration helpers collect observations; their step label `pass` means collection completed, not that the observed behavior is defect-free. The six persistent Playwright tests contain two ordinary passes and four explicit expected failures. Their JSON includes actual assertion errors. Vitest likewise has 15 `it.fails` cases. Remove expected-failure markers only when implementing the matching product fix. `frontend-negative-controls.py` is an optional diagnostic that temporarily changes markers and restores exact bytes; do not run it concurrently with other tests or builds.

## Evidence limitations

All checked-in images use synthetic/local data. Performance is unthrottled local development data with a mocked font, not a Lighthouse production score. Secret scans deliberately exclude environment and credential files and history. The package inventory is not a vulnerability advisory result. The CI Node20 package could not be installed; validation ran on Node26.7.0, with hosted CI pending.
