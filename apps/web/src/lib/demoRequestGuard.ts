/**
 * Monotonic generation guard for async demo loads.
 *
 * Demo compositions load over fetch, so a slow response for a previously
 * requested scene can resolve after the user has moved on to a newer scene.
 * Each load takes a token from begin(); only the newest token is current, and
 * stale resolutions must be ignored instead of overwriting the newer scene's
 * state. Selection changes invalidate in-flight loads via invalidate().
 * Same convention as the shared-Transport token in demoPlayback.ts.
 */
export function createDemoRequestGuard() {
  let latestRequestId = 0;

  return {
    /** Claim the token for a new demo request; it is current until the next begin/invalidate. */
    begin(): number {
      latestRequestId += 1;
      return latestRequestId;
    },
    /** Retire any in-flight request without starting a new one (e.g. scene selection changed). */
    invalidate(): void {
      latestRequestId += 1;
    },
    /** True only when requestId is still the newest (i.e. safe to publish its result). */
    isCurrent(requestId: number): boolean {
      return requestId === latestRequestId;
    },
  };
}

export type DemoRequestGuard = ReturnType<typeof createDemoRequestGuard>;
