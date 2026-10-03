import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyzeImageForLinearLandscape } from '@toposonics/core-image';
import {
  analyzeImageFile, analyzeImageFileDepthRidge, analyzeImageFileMultiVoice,
  extractPixelData, loadImageFromFile,
} from '../imageProcessing';
import { generateImageThumbnail } from '../imageThumbnail';

// Exercise the real workspace analyzer without requiring generated dist artifacts.
vi.mock('@toposonics/core-image', () => import('../../../../../packages/core-image/src'));

/** Model the integer bitmap dimensions and getImageData conversion in a real canvas. */
function stubCanvas() {
  const context = {
    drawImage: vi.fn(),
    getImageData: vi.fn((_x: number, _y: number, width: number, height: number) => ({
      data: new Uint8ClampedArray(Math.trunc(width) * Math.trunc(height) * 4).fill(128),
    })),
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
    toDataURL: vi.fn(() => 'data:image/jpeg;base64,cWE='),
  };
  vi.stubGlobal('document', { createElement: vi.fn(() => canvas) });
  return { canvas, context };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('QA image input boundaries', () => {
  it.each([[1, 1], [1200, 1200], [2400, 1600], [1600, 2400]])(
    'returns a consistent pixel buffer for %ix%i integer-aspect input',
    (width, height) => {
      stubCanvas();
      const result = extractPixelData({ width, height } as HTMLImageElement);
      expect(result.pixels.length).toBe(result.width * result.height * 4);
      expect(Math.max(result.width, result.height)).toBeLessThanOrEqual(1200);
      const analysis = analyzeImageForLinearLandscape(result.pixels, result.width, result.height, {
        averageRows: true, rowsToAverage: 5,
      });
      expect(analysis.brightnessProfile.every(Number.isFinite)).toBe(true);
    }
  );

  it('FE-001: resized portrait dimensions remain integers accepted by the analyzer', () => {
    stubCanvas();
    const result = extractPixelData({ width: 1301, height: 2000 } as HTMLImageElement);
    // The bitmap and analyzer must agree on the integer resized dimensions.
    expect(() => analyzeImageForLinearLandscape(result.pixels, result.width, result.height, {
      averageRows: true, rowsToAverage: 5,
    }))
      .not.toThrow();
    expect(Number.isInteger(result.width)).toBe(true);
    expect(result.pixels.length).toBe(result.width * result.height * 4);
  });

  it('FE-001: a very thin image keeps both resized dimensions at least one pixel', () => {
    stubCanvas();
    const result = extractPixelData({ width: 1, height: 3000 } as HTMLImageElement);
    expect(result.width).toBeGreaterThanOrEqual(1);
    expect(result.pixels.length).toBeGreaterThan(0);
  });

  it('reports an unavailable canvas context', () => {
    const { canvas } = stubCanvas();
    canvas.getContext.mockReturnValueOnce(null as never);
    expect(() => extractPixelData({ width: 8, height: 8 } as HTMLImageElement))
      .toThrow('Failed to get canvas context');
  });
});

describe.each([
  ['linear', analyzeImageFile],
  ['depth/ridge', analyzeImageFileDepthRidge],
  ['multi-voice', analyzeImageFileMultiVoice],
] as const)('FE-001: %s analysis pipeline', (_mode, analyze) => {
  it.each([
    [1301, 2000, 781, 1200],
    [2000, 1301, 1200, 781],
    [1, 3000, 1, 1200],
    [3000, 1, 1200, 1],
  ])('uses a consistent positive integer bitmap for %ix%i input', async (width, height, expectedWidth, expectedHeight) => {
    const { canvas, context } = stubCanvas();
    vi.stubGlobal('Image', class {
      width = width;
      height = height;
      onload: (() => void) | undefined;
      set src(_value: string) { queueMicrotask(() => this.onload?.()); }
    });
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:qa-image'), revokeObjectURL: vi.fn(),
    });

    const result = await analyze({} as File);
    expect([result.width, result.height]).toEqual([expectedWidth, expectedHeight]);
    expect([canvas.width, canvas.height]).toEqual([expectedWidth, expectedHeight]);
    expect(context.getImageData).toHaveBeenCalledExactlyOnceWith(0, 0, expectedWidth, expectedHeight);
    expect(context.drawImage).toHaveBeenCalledTimes(2);
    for (const call of context.drawImage.mock.calls) {
      expect(call.slice(1)).toEqual([0, 0, expectedWidth, expectedHeight]);
    }
    expect(result.analysis).toMatchObject({ width: expectedWidth, height: expectedHeight });
    expect(result.analysis.brightnessProfile.length).toBeGreaterThan(0);
    for (const profile of Object.values(result.analysis).filter(Array.isArray)) {
      expect(profile.every(Number.isFinite)).toBe(true);
    }
  });
});

describe('QA image resource cleanup', () => {
  function stubImage(fail: boolean) {
    vi.stubGlobal('Image', class {
      width = 2000;
      height = 1000;
      onload: (() => void) | undefined;
      onerror: (() => void) | undefined;
      set src(_value: string) { queueMicrotask(() => fail ? this.onerror?.() : this.onload?.()); }
    });
    const revoke = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:qa-image'), revokeObjectURL: revoke });
    return revoke;
  }

  it.each([false, true])('releases the upload URL after decode failure=%s', async (fail) => {
    const revoke = stubImage(fail);
    const operation = loadImageFromFile({} as File);
    if (fail) await expect(operation).rejects.toThrow('Failed to load image');
    else await expect(operation).resolves.toMatchObject({ width: 2000, height: 1000 });
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:qa-image');
  });

  it('limits save thumbnails to 256px and releases the object URL', async () => {
    const revoke = stubImage(false);
    const { canvas } = stubCanvas();
    await expect(generateImageThumbnail({} as File)).resolves.toMatch(/^data:image\/jpeg/);
    expect([canvas.width, canvas.height]).toEqual([256, 128]);
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:qa-image');
  });

  it('releases the thumbnail URL if canvas allocation fails', async () => {
    const revoke = stubImage(false);
    const { canvas } = stubCanvas();
    canvas.getContext.mockReturnValueOnce(null as never);
    await expect(generateImageThumbnail({} as File)).rejects.toThrow('Canvas 2D context unavailable');
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:qa-image');
  });
});
