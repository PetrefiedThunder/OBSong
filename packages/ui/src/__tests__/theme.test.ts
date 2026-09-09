import { describe, it, expect } from 'vitest';
import { theme } from '../index';

describe('@toposonics/ui theme tokens', () => {
  it('exposes primary, secondary, and surface color groups', () => {
    expect(theme.colors).toHaveProperty('primary');
    expect(theme.colors).toHaveProperty('secondary');
    expect(theme.colors).toHaveProperty('surface');
  });

  it('keeps the primary ramp complete from 50 to 950 with a DEFAULT', () => {
    const steps = ['DEFAULT', '50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
    for (const step of steps) {
      expect(theme.colors.primary).toHaveProperty(step);
    }
  });

  it('uses valid hex colors for every token', () => {
    const hex = /^#[0-9a-f]{6}$/i;
    const flatten = (obj: Record<string, unknown>): string[] =>
      Object.values(obj).flatMap((v) =>
        typeof v === 'string' ? [v] : flatten(v as Record<string, unknown>),
      );
    for (const value of flatten(theme.colors)) {
      expect(value).toMatch(hex);
    }
  });

  it('keeps the dark surface palette stable', () => {
    expect(theme.colors.surface.primary).toBe('#0a0a0f');
    expect(theme.colors.primary.DEFAULT).toBe('#0284c7');
    expect(theme.colors.secondary.DEFAULT).toBe('#a855f7');
  });
});
