import type { ImageDimensions } from '../../types/colors';
import type { DecodedImageSource } from './decodeImage';

export interface DownsampledCanvasResult {
  imageData: ImageData;
  processedDimensions: ImageDimensions;
}

export function computeDownsampledDimensions(
  originalWidth: number,
  originalHeight: number,
  maxDimension: number
): ImageDimensions {
  const longestSide = Math.max(originalWidth, originalHeight);
  if (longestSide <= maxDimension) {
    return { width: originalWidth, height: originalHeight };
  }

  const scale = maxDimension / longestSide;
  return {
    width: Math.max(1, Math.round(originalWidth * scale)),
    height: Math.max(1, Math.round(originalHeight * scale))
  };
}

/**
 * Draws the decoded image onto a temporary offscreen Canvas scaled to fit
 * within maxDimension while preserving original aspect ratio, then extracts
 * ImageData and immediately frees the canvas buffer.
 */
export function downsampleImage(
  decoded: DecodedImageSource,
  maxDimension: number
): DownsampledCanvasResult {
  const processedDimensions = computeDownsampledDimensions(
    decoded.width,
    decoded.height,
    maxDimension
  );

  // Prefer OffscreenCanvas when 2D context is available; fall back to HTMLCanvasElement
  if (typeof OffscreenCanvas !== 'undefined') {
    const offscreen = new OffscreenCanvas(
      processedDimensions.width,
      processedDimensions.height
    );
    const ctx = offscreen.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      // Nearest-neighbor downsampling avoids synthesizing artificial blended colours along sharp UI edges
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, processedDimensions.width, processedDimensions.height);
      ctx.drawImage(
        decoded.source,
        0,
        0,
        processedDimensions.width,
        processedDimensions.height
      );

      const imageData = ctx.getImageData(
        0,
        0,
        processedDimensions.width,
        processedDimensions.height
      );
      offscreen.width = 0;
      offscreen.height = 0;

      return { imageData, processedDimensions };
    }
  }

  if (typeof document === 'undefined') {
    throw new Error('CANVAS_UNAVAILABLE');
  }

  const canvas = document.createElement('canvas');
  canvas.width = processedDimensions.width;
  canvas.height = processedDimensions.height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    canvas.width = 0;
    canvas.height = 0;
    throw new Error('CANVAS_UNAVAILABLE');
  }

  try {
    // Nearest-neighbor downsampling avoids synthesizing artificial blended colours along sharp UI edges
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, processedDimensions.width, processedDimensions.height);
    ctx.drawImage(
      decoded.source,
      0,
      0,
      processedDimensions.width,
      processedDimensions.height
    );

    const imageData = ctx.getImageData(
      0,
      0,
      processedDimensions.width,
      processedDimensions.height
    );
    return { imageData, processedDimensions };
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}
