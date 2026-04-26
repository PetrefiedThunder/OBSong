# TopoSonics Mobile Readiness Summary

Current high-level status summary for the mobile platform and its release workflow.

## Current State

### Android

- Committed native project at `apps/mobile/android`
- Native image-processing module is wired into the app
- On-device generation is supported in the mobile editor
- Local release bundles can be built with Gradle
- Store builds can be produced through EAS

### iOS

- Committed native project at `apps/mobile/ios`
- Sign-in, browsing, and composition detail flows are supported
- On-device generation is intentionally disabled in the current v1 contract
- Release archives can be produced through Xcode or EAS

## Security And Auth

- Mobile auth uses Supabase sessions
- Secure token persistence is handled through `expo-secure-store`
- Composition library access is authenticated/private-only

## Build And Submission Workflow

Primary release documentation lives here:

- [apps/mobile/README.md](../apps/mobile/README.md)
- [docs/ANDROID_SETUP.md](ANDROID_SETUP.md)
- [docs/MOBILE_SUBMISSION.md](MOBILE_SUBMISSION.md)

## Validation Baseline

Use these as the ongoing health checks:

```bash
corepack pnpm typecheck
corepack pnpm test
```

Manual QA guidance lives in:

- [TESTING.md](../TESTING.md)
- [CROSS_PLATFORM_TESTING.md](../CROSS_PLATFORM_TESTING.md)

## Known Product Limits

- Mobile generation is Android-only in v1
- Mobile playback is a lightweight preview flow, not web synthesis parity
- The composition library is private-only and requires authentication

## Notes On This Document

This file replaces an older historical branch-specific retrofit summary. It is now intended to describe the current mobile platform state rather than preserve outdated implementation history.
