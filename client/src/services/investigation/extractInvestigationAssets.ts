import type {
  ElementVisualAssets,
  InvestigationAssets,
  NormalizedBoundingBox,
  RegionMeasuredColor,
  VisualElement,
  VisualRegion
} from '../../types/investigation';
import { decodeImage } from '../imageProcessing/decodeImage';
import { extractPixels } from '../imageProcessing/extractPixels';
import { quantizeColors } from '../imageProcessing/quantizeColors';
import { normalizedBoxToPixels } from './regionSchema';

const MAX_COLOR_SAMPLE_DIM = 180;
const MAX_CROP_PREVIEW_W = 360;
const MAX_CROP_PREVIEW_H = 220;

function sampleBoxColors(
  source: CanvasImageSource,
  imageWidth: number,
  imageHeight: number,
  box: NormalizedBoundingBox,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  maxColors: number
): RegionMeasuredColor[] {
  const pxBox = normalizedBoxToPixels(box, imageWidth, imageHeight);
  if (pxBox.width < 2 || pxBox.height < 2) return [];

  const scale = Math.min(1, MAX_COLOR_SAMPLE_DIM / Math.max(pxBox.width, pxBox.height));
  const targetW = Math.max(1, Math.round(pxBox.width * scale));
  const targetH = Math.max(1, Math.round(pxBox.height * scale));

  canvas.width = targetW;
  canvas.height = targetH;
  ctx.clearRect(0, 0, targetW, targetH);
  ctx.drawImage(
    source,
    pxBox.x,
    pxBox.y,
    pxBox.width,
    pxBox.height,
    0,
    0,
    targetW,
    targetH
  );

  const imageData = ctx.getImageData(0, 0, targetW, targetH);
  const sampling = extractPixels(imageData, 128);
  if (sampling.sampledPixels === 0 || sampling.bins.length === 0) return [];

  const quantized = quantizeColors(sampling.bins, {
    sampledPixels: sampling.sampledPixels,
    maxColors,
    mergeThreshold: 12,
    minPercentage: 1.5
  });

  return quantized.colors.map((c) => ({
    hex: c.hex,
    percentage: c.percentage,
    rank: c.rank
  }));
}

function cropBoxPreview(
  source: CanvasImageSource,
  imageWidth: number,
  imageHeight: number,
  box: NormalizedBoundingBox,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): string | null {
  const rawPx = normalizedBoxToPixels(box, imageWidth, imageHeight);
  if (rawPx.width < 4 || rawPx.height < 4) return null;

  // Add subtle 4% visual breathing margin (clamped to screenshot bounds) so borders & corner radii are legible
  const padX = Math.min(14, Math.round(rawPx.width * 0.05));
  const padY = Math.min(14, Math.round(rawPx.height * 0.05));
  const sx = Math.max(0, rawPx.x - padX);
  const sy = Math.max(0, rawPx.y - padY);
  const sw = Math.min(imageWidth - sx, rawPx.width + padX * 2);
  const sh = Math.min(imageHeight - sy, rawPx.height + padY * 2);

  if (sw < 4 || sh < 4) return null;

  const scale = Math.min(1, MAX_CROP_PREVIEW_W / sw, MAX_CROP_PREVIEW_H / sh);
  const targetW = Math.max(1, Math.round(sw * scale));
  const targetH = Math.max(1, Math.round(sh * scale));

  canvas.width = targetW;
  canvas.height = targetH;
  ctx.clearRect(0, 0, targetW, targetH);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, targetW, targetH);

  try {
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

/**
 * Single-decode local image processing pipeline for M8 & M9 Visual Investigation.
 * Decodes the uploaded screenshot File ONCE via existing M4 `decodeImage`, then:
 * 1. Measures dominant pixel colours for every M8 VisualRegion.
 * 2. Measures dominant pixel colours and generates real cropped screenshot previews
 *    (primary + repeated occurrences) for every M9 VisualElement.
 * Releases decoded bitmap resources immediately upon completion.
 */
export async function extractInvestigationAssets(
  file: File,
  regions: readonly VisualRegion[],
  elements: readonly VisualElement[]
): Promise<InvestigationAssets> {
  if (!file || (regions.length === 0 && elements.length === 0)) {
    return { regionColors: {}, elementAssets: {} };
  }

  const decoded = await decodeImage(file);
  const regionColors: Record<string, RegionMeasuredColor[]> = {};
  const elementAssets: Record<string, ElementVisualAssets> = {};
  const sampleCanvas = document.createElement('canvas');
  const cropCanvas = document.createElement('canvas');

  try {
    const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
    const cropCtx = cropCanvas.getContext('2d');

    if (!sampleCtx || !cropCtx) {
      return { regionColors, elementAssets };
    }

    // 1. M8 Region measured pixel colours
    for (const region of regions) {
      regionColors[region.id] = sampleBoxColors(
        decoded.source,
        decoded.width,
        decoded.height,
        region.boundingBox,
        sampleCanvas,
        sampleCtx,
        5
      );
    }

    // 2. M9 Element cropped screenshot previews + measured pixel colours
    for (const element of elements) {
      const measuredColors = sampleBoxColors(
        decoded.source,
        decoded.width,
        decoded.height,
        element.boundingBox,
        sampleCanvas,
        sampleCtx,
        4
      );

      const primaryCropUrl = cropBoxPreview(
        decoded.source,
        decoded.width,
        decoded.height,
        element.boundingBox,
        cropCanvas,
        cropCtx
      );

      const occurrenceCropUrls: string[] = [];
      if (primaryCropUrl) occurrenceCropUrls.push(primaryCropUrl);

      for (const extraBox of element.additionalLocations.slice(0, 4)) {
        const extraCrop = cropBoxPreview(
          decoded.source,
          decoded.width,
          decoded.height,
          extraBox,
          cropCanvas,
          cropCtx
        );
        if (extraCrop) occurrenceCropUrls.push(extraCrop);
      }

      elementAssets[element.id] = {
        primaryCropUrl,
        occurrenceCropUrls,
        measuredColors
      };
    }

    return { regionColors, elementAssets };
  } catch {
    return { regionColors, elementAssets };
  } finally {
    decoded.release();
    sampleCanvas.width = 0;
    sampleCanvas.height = 0;
    cropCanvas.width = 0;
    cropCanvas.height = 0;
  }
}
