import { describe, expect, it } from 'vitest';
import { createDemoRequestGuard } from '../demoRequestGuard';

// SEL-208 (OBS-FE-001): a delayed demo response must not overwrite a newer
// scene selection. Both async demo loaders (landing page handlePlayDemo and
// ScenePackSelector handleLoadDemo) publish only when their request token is
// still current and retire in-flight loads on selection change.
describe('demoRequestGuard', () => {
  it('marks the first of two overlapping requests stale and keeps the newest current', () => {
    const guard = createDemoRequestGuard();
    // User requests scene A with a deliberately held response, then scene B.
    const requestA = guard.begin();
    const requestB = guard.begin();

    // B resolves first and publishes; A's delayed response must be ignored.
    expect(guard.isCurrent(requestB)).toBe(true);
    expect(guard.isCurrent(requestA)).toBe(false);
  });

  it('retires an in-flight demo load when the scene selection changes', () => {
    const guard = createDemoRequestGuard();
    const requestA = guard.begin();

    // User selects a newer scene without requesting another demo.
    guard.invalidate();

    expect(guard.isCurrent(requestA)).toBe(false);
  });

  it('treats each sequential request as current in turn', () => {
    const guard = createDemoRequestGuard();
    const first = guard.begin();
    expect(guard.isCurrent(first)).toBe(true);

    const second = guard.begin();
    expect(guard.isCurrent(first)).toBe(false);
    expect(guard.isCurrent(second)).toBe(true);
  });

  it('keeps guards independent across component instances', () => {
    const landing = createDemoRequestGuard();
    const studio = createDemoRequestGuard();
    const landingRequest = landing.begin();

    expect(studio.isCurrent(landingRequest)).toBe(false);
    expect(landing.isCurrent(landingRequest)).toBe(true);
  });
});
