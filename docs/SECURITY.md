# Security Scanning

This repo's automated security scanning has two layers:

## Dependency auditing — `dependency-audit.yml`

`.github/workflows/dependency-audit.yml` runs `pnpm audit --audit-level high` on every
pull request, on pushes to `main`, and weekly (Mondays 08:00 UTC). It is currently
**advisory** (`|| true`): it reports high/critical advisories without failing the check,
so a newly published advisory does not block unrelated PRs. Tighten it to a failing gate
once the dependency tree is clean.

This workflow replaced the old CRDA workflow (`crda.yml`), which was removed because:

- Red Hat's CRDA service was discontinued, so the scan could never succeed.
- It ran on `pull_request_target` with a base-branch checkout, so even a working scan
  would have analyzed `main` instead of the PR's changes.
- It ran `npm install` in a pnpm monorepo, which the repo's preinstall guard hard-fails,
  and required a `CRDA_KEY` secret that was never configured.

## Code scanning — GitHub CodeQL default setup

CodeQL runs via GitHub's **default setup** (configured at the repository level, scanning
JavaScript/TypeScript and GitHub Actions on push, PR, and a weekly schedule). There is
intentionally **no** in-repo `codeql.yml`: an advanced CodeQL workflow cannot coexist
with default setup — its SARIF upload is rejected, which would fail a check on every
run. If the repo ever switches to advanced setup, restore the stock GitHub CodeQL
workflow template (push/PR on `main` plus a weekly cron) at that time.
