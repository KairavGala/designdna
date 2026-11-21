import { decodeImage } from './decodeImage';
import { computeDownsampledDimensions } from './downsampleImage';

export interface PreparedAnalysisImage {
  imageBase64: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
}

const MAX_ANALYSIS_DIMENSION = 1280;
const FALLBACK_ANALYSIS_DIMENSION = 1024;
const DIRECT_PASS_MAX_BYTES = 350 * 1024;
const TARGET_MAX_BASE64_CHARS = 650 * 1024;

function readBlobAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Failed to encode screenshot for analysis.'));
        return;
      }
      const commaIndex = reader.result.indexOf(',');
      if (commaIndex === -1) {
        reject(new Error('Unexpected data URL format while encoding screenshot.'));
        return;
      }
      resolve(reader.result.slice(commaIndex + 1));
    };
    reader.onerror = () => {
      reject(new Error('Failed to read screenshot file.'));
    };
    reader.readAsDataURL(blob);
  });
}

function resolveMimeType(
  rawMime: string
): 'image/png' | 'image/jpeg' | 'image/webp' {
  if (rawMime === 'image/png' || rawMime === 'image/jpeg' || rawMime === 'image/webp') {
    return rawMime;
  }
  return 'image/png';
}

function renderResizedJpegBase64(
  source: CanvasImageSource,
  width: number,
  height: number,
  quality: number
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable while preparing analysis image.');
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex === -1) {
      throw new Error('Failed to serialise resized screenshot.');
    }
    return dataUrl.slice(commaIndex + 1);
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

/**
 * Prepares a size-bounded base64 screenshot payload for transient server-side
 * Gemini visual interpretation without modifying or persisting the original File.
 */
export async function prepareAnalysisPayload(
  file: File,
  originalWidth: number,
  originalHeight: number,
  verifiedMimeType?: string
): Promise<PreparedAnalysisImage> {
  const longestSide = Math.max(originalWidth, originalHeight);

  // Already-compact images can be encoded directly without re-rasterising
  if (longestSide <= MAX_ANALYSIS_DIMENSION && file.size <= DIRECT_PASS_MAX_BYTES) {
    const imageBase64 = await readBlobAsBase64(file);
    return {
      imageBase64,
      mimeType: resolveMimeType(verifiedMimeType || file.type)
    };
  }

  // Resize cleanly to max 1280px JPEG preserving aspect ratio for crisp visual legibility & fast upload
  const decoded = await decodeImage(file);
  try {
    const primaryTarget = computeDownsampledDimensions(
      decoded.width,
      decoded.height,
      MAX_ANALYSIS_DIMENSION
    );
    let imageBase64 = renderResizedJpegBase64(
      decoded.source,
      primaryTarget.width,
      primaryTarget.height,
      0.82
    );

    // If a very dense screenshot still encodes large, step down slightly to keep upload + vision latency low
    if (imageBase64.length > TARGET_MAX_BASE64_CHARS) {
      const secondaryTarget = computeDownsampledDimensions(
        decoded.width,
        decoded.height,
        FALLBACK_ANALYSIS_DIMENSION
      );
      imageBase64 = renderResizedJpegBase64(
        decoded.source,
        secondaryTarget.width,
        secondaryTarget.height,
        0.78
      );
    }

    return {
      imageBase64,
      mimeType: 'image/jpeg'
    };
  } finally {
    decoded.release();
  }
}
