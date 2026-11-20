import type { RegionMeasuredColor, VisualRegion } from '../../types/investigation';
import { decodeImage } from '../imageProcessing/decodeImage';
import { extractPixels } from '../imageProcessing/extractPixels';
import { quantizeColors } from '../imageProcessing/quantizeColors';
import { normalizedBoxToPixels } from './regionSchema';

const MAX_REGION_SAMPLE_DIM = 180;

/**
 * Measures the actual dominant pixel colours inside each annotated region's
 * normalized bounding box directly from the uploaded screenshot using the
 * existing M4 Canvas sampling and quantization helpers (zero duplicated algorithms).
 */
export async function sampleColorsForRegions(
  file: File,
  regions: readonly VisualRegion[]
): Promise<Record<string, RegionMeasuredColor[]>> {
  if (!file || regions.length === 0) {
    return {};
  }

  const decoded = await decodeImage(file);
  const results: Record<string, RegionMeasuredColor[]> = {};

  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      return {};
    }

    for (const region of regions) {
      const pxBox = normalizedBoxToPixels(region.boundingBox, decoded.width, decoded.height);
      if (pxBox.width < 2 || pxBox.height < 2) {
        results[region.id] = [];
        continue;
      }

      const scale = Math.min(
        1,
        MAX_REGION_SAMPLE_DIM / Math.max(pxBox.width, pxBox.height)
      );
      const targetW = Math.max(1, Math.round(pxBox.width * scale));
      const targetH = Math.max(1, Math.round(pxBox.height * scale));

      canvas.width = targetW;
      canvas.height = targetH;
      ctx.clearRect(0, 0, targetW, targetH);
      ctx.drawImage(
        decoded.source,
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
      if (sampling.sampledPixels === 0 || sampling.bins.length === 0) {
        results[region.id] = [];
        continue;
      }

      const quantized = quantizeColors(sampling.bins, {
        sampledPixels: sampling.sampledPixels,
        maxColors: 5,
        mergeThreshold: 12,
        minPercentage: 1.5
      });

      results[region.id] = quantized.colors.map((c) => ({
        hex: c.hex,
        percentage: c.percentage,
        rank: c.rank
      }));
    }

    return results;
  } catch {
    return results;
  } finally {
    decoded.release();
  }
}
