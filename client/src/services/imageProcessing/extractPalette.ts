import {
  DEFAULT_EXTRACTION_OPTIONS,
  type ColorExtractionOptions,
  type ExtractionError,
  type PaletteExtractionResult
} from '../../types/colors';
import { decodeImage } from './decodeImage';
import { downsampleImage } from './downsampleImage';
import { extractPixels } from './extractPixels';
import { quantizeColors } from './quantizeColors';

export class ColorExtractionException extends Error {
  public readonly details: ExtractionError;

  constructor(details: ExtractionError) {
    super(details.message);
    this.name = 'ColorExtractionException';
    this.details = details;
  }
}

function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/**
 * Full deterministic browser-based colour extraction pipeline.
 * Independently testable outside React; never uploads or mutates the input File.
 */
export async function extractPalette(
  file: File,
  options: ColorExtractionOptions = {}
): Promise<PaletteExtractionResult> {
  const maxDimension = options.maxDimension ?? DEFAULT_EXTRACTION_OPTIONS.maxDimension;
  const minAlpha = options.minAlpha ?? DEFAULT_EXTRACTION_OPTIONS.minAlpha;
  const maxColors = options.maxColors ?? DEFAULT_EXTRACTION_OPTIONS.maxColors;
  const mergeThreshold = options.mergeThreshold ?? DEFAULT_EXTRACTION_OPTIONS.mergeThreshold;
  const minPercentage = options.minPercentage ?? DEFAULT_EXTRACTION_OPTIONS.minPercentage;
  const onStage = options.onStage;

  const startTime = performance.now();

  if (!file || file.size === 0) {
    throw new ColorExtractionException({
      code: 'MISSING_IMAGE',
      title: 'Missing screenshot file',
      message: 'No valid screenshot file was provided for colour extraction.'
    });
  }

  // Stage 1: Decode image into browser bitmap
  onStage?.('decoding');
  let decoded;
  try {
    decoded = await decodeImage(file);
  } catch {
    throw new ColorExtractionException({
      code: 'DECODE_ERROR',
      title: 'Unable to decode screenshot',
      message:
        'The browser could not decode this screenshot into pixel data. Try replacing the image.'
    });
  }

  try {
    // Stage 2: Downsample onto offscreen Canvas
    onStage?.('downsampling');
    await yieldToMainThread();

    let downsampled;
    try {
      downsampled = downsampleImage(decoded, maxDimension);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'SecurityError') {
        throw new ColorExtractionException({
          code: 'CANVAS_SECURITY_ERROR',
          title: 'Canvas security restriction',
          message:
            'The browser blocked reading pixel data from this image due to a security policy.'
        });
      }
      if (err instanceof Error && err.message === 'CANVAS_UNAVAILABLE') {
        throw new ColorExtractionException({
          code: 'CANVAS_UNAVAILABLE',
          title: 'Canvas 2D context unavailable',
          message:
            'This browser environment does not support Canvas 2D pixel extraction.'
        });
      }
      throw new ColorExtractionException({
        code: 'UNEXPECTED_ERROR',
        title: 'Image downsampling failed',
        message: 'An unexpected error occurred while preparing the image on Canvas.'
      });
    }

    // Stage 3: Sample opaque pixels into deterministic histogram bins
    onStage?.('sampling');
    const sampling = extractPixels(downsampled.imageData, minAlpha);

    if (sampling.sampledPixels === 0 || sampling.bins.length === 0) {
      throw new ColorExtractionException({
        code: 'EMPTY_PIXEL_DATA',
        title: 'No visible pixels found',
        message:
          'This image contains only transparent pixels. Upload a screenshot with visible content.'
      });
    }

    // Stage 4: Deterministic quantization, K-Means refinement, and CIE Lab merging
    onStage?.('clustering');
    await yieldToMainThread();

    const quantized = quantizeColors(sampling.bins, {
      sampledPixels: sampling.sampledPixels,
      maxColors,
      mergeThreshold,
      minPercentage
    });

    if (quantized.colors.length === 0) {
      throw new ColorExtractionException({
        code: 'EMPTY_PIXEL_DATA',
        title: 'No colours extracted',
        message: 'Could not extract representative colours from the sampled pixel data.'
      });
    }

    const durationMs = Math.max(1, Math.round(performance.now() - startTime));

    return {
      sourceFileName: file.name,
      colors: quantized.colors,
      statistics: {
        originalDimensions: {
          width: decoded.width,
          height: decoded.height
        },
        processedDimensions: downsampled.processedDimensions,
        totalPixels: sampling.totalPixels,
        sampledPixels: sampling.sampledPixels,
        excludedTransparentPixels: sampling.excludedTransparentPixels,
        uniqueQuantizedBins: sampling.bins.length,
        coveragePercentage: quantized.coveragePercentage,
        durationMs,
        method: 'Canvas · Weighted Median-Cut + CIE Lab Merge'
      }
    };
  } finally {
    decoded.release();
  }
}
