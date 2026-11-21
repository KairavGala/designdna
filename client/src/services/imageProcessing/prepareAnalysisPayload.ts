import { decodeImage } from './decodeImage';
import { computeDownsampledDimensions } from './downsampleImage';

export interface PreparedAnalysisImage {
  imageBase64: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
}

const MAX_ANALYSIS_DIMENSION = 1280;
const DIRECT_PASS_MAX_BYTES = 1.5 * 1024 * 1024;

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

  // Small, already-compact images can be encoded directly without re-rasterising
  if (longestSide <= MAX_ANALYSIS_DIMENSION && file.size <= DIRECT_PASS_MAX_BYTES) {
    const imageBase64 = await readBlobAsBase64(file);
    return {
      imageBase64,
      mimeType: resolveMimeType(verifiedMimeType || file.type)
    };
  }

  // Otherwise resize cleanly to max 1280px preserving aspect ratio for crisp visual legibility
  const decoded = await decodeImage(file);
  const target = computeDownsampledDimensions(
    decoded.width,
    decoded.height,
    MAX_ANALYSIS_DIMENSION
  );

  const canvas = document.createElement('canvas');
  canvas.width = target.width;
  canvas.height = target.height;

  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable while preparing analysis image.');
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(decoded.source, 0, 0, target.width, target.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex === -1) {
      throw new Error('Failed to serialise resized screenshot.');
    }

    return {
      imageBase64: dataUrl.slice(commaIndex + 1),
      mimeType: 'image/jpeg'
    };
  } finally {
    decoded.release();
    canvas.width = 0;
    canvas.height = 0;
  }
}
