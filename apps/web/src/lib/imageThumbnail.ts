/**
 * Client-side thumbnail generation for composition saves.
 *
 * Downscales the user's uploaded image to a small JPEG data URL so the
 * composition detail page can show the source image without shipping the
 * original (the API caps imageThumbnail at 500 KB; a 256px JPEG is ~10-40 KB).
 */
export async function generateImageThumbnail(
  file: File,
  maxDim = 256,
  quality = 0.7
): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to load image for thumbnail'));
      image.src = url;
    });

    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
