import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * Re-import the module with a controlled `expo-modules-core` proxy so we can exercise the
 * three platform states: module absent (web/Expo Go), present-but-unavailable (iOS stub),
 * and available (Android).
 */
async function loadWith(nativeModule: unknown) {
  vi.resetModules();
  vi.doMock('expo-modules-core', () => ({
    NativeModulesProxy: { NativeImageProcessing: nativeModule },
  }));
  return import('../index');
}

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('expo-modules-core');
});

describe('native-image-processing availability contract', () => {
  it('does not throw at import when the native module is absent', async () => {
    // The whole point of removing the module-scope throw: importing on an unsupported
    // platform must not crash the bundle.
    await expect(loadWith(undefined)).resolves.toBeDefined();
    const mod = await loadWith(undefined);
    expect(mod.isNativeImageProcessingAvailable()).toBe(false);
  });

  it('reports unavailable when the module exists but isAvailable is false (iOS stub)', async () => {
    const mod = await loadWith({ isAvailable: false, processImage: vi.fn() });
    expect(mod.isNativeImageProcessingAvailable()).toBe(false);
  });

  it('rejects processImage when unavailable instead of calling native', async () => {
    const processImage = vi.fn();
    const mod = await loadWith({ isAvailable: false, processImage });
    await expect(mod.processImage({ uri: 'file://x' })).rejects.toThrow(/not available/i);
    expect(processImage).not.toHaveBeenCalled();
  });

  it('reports available and returns a typed result on Android', async () => {
    const native = {
      isAvailable: true,
      processImage: vi.fn().mockResolvedValue({ pixels: [1, 2, 3, 4], width: 1, height: 1 }),
    };
    const mod = await loadWith(native);
    expect(mod.isNativeImageProcessingAvailable()).toBe(true);
    const result = await mod.processImage({ uri: 'file://x' });
    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
    expect(result.pixels).toBeInstanceOf(Uint8Array);
  });

  it('throws on an invalid native payload', async () => {
    const native = {
      isAvailable: true,
      processImage: vi.fn().mockResolvedValue({ pixels: [], width: 'nope' }),
    };
    const mod = await loadWith(native);
    await expect(mod.processImage({ uri: 'file://x' })).rejects.toThrow(/invalid payload/i);
  });
});
