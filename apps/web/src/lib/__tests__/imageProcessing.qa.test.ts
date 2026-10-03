import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyzeImageForLinearLandscape } from '@toposonics/core-image';
import { extractPixelData, loadImageFromFile } from '../imageProcessing';
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

  it.fails('FE-001: resized portrait dimensions remain integers accepted by the analyzer', () => {
    stubCanvas();
    const result = extractPixelData({ width: 1301, height: 2000 } as HTMLImageElement);
    // Real canvas getImageData returns 780 * 1200 pixels, but the adapter returns width=780.6.
    expect(() => analyzeImageForLinearLandscape(result.pixels, result.width, result.height, {
      averageRows: true, rowsToAverage: 5,
    }))
      .not.toThrow();
    expect(Number.isInteger(result.width)).toBe(true);
    expect(result.pixels.length).toBe(result.width * result.height * 4);
  });

  it.fails('FE-001: a very thin image keeps both resized dimensions at least one pixel', () => {
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
