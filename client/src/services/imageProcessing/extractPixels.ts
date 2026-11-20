export interface ColorBin {
  /** Deterministic 15-bit key (5 bits per RGB channel) */
  key: number;
  /** Exact accumulated R channel sum for lossless flat-colour centroid */
  sumR: number;
  sumG: number;
  sumB: number;
  /** Accumulated squared channel sums for intra-cluster variance measurement */
  sumSqR: number;
  sumSqG: number;
  sumSqB: number;
  count: number;
  /** Exact mean RGB of pixels in this bin */
  meanR: number;
  meanG: number;
  meanB: number;
}

export interface PixelSamplingResult {
  bins: ColorBin[];
  totalPixels: number;
  sampledPixels: number;
  excludedTransparentPixels: number;
}

/**
 * Reads RGBA ImageData, excludes transparent pixels (alpha < minAlpha), and
 * aggregates visible pixels into deterministic 5-bit-per-channel RGB histogram
 * bins while preserving exact channel sums so flat UI colours retain exact HEX.
 */
export function extractPixels(
  imageData: ImageData,
  minAlpha: number
): PixelSamplingResult {
  const { data, width, height } = imageData;
  const totalPixels = width * height;

  const binMap = new Map<
    number,
    {
      sumR: number;
      sumG: number;
      sumB: number;
      sumSqR: number;
      sumSqG: number;
      sumSqB: number;
      count: number;
    }
  >();

  let sampledPixels = 0;
  let excludedTransparentPixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < minAlpha) {
      excludedTransparentPixels += 1;
      continue;
    }

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    sampledPixels += 1;

    // 5-bit per channel quantization key (32 × 32 × 32 space)
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const existing = binMap.get(key);

    if (existing) {
      existing.sumR += r;
      existing.sumG += g;
      existing.sumB += b;
      existing.sumSqR += r * r;
      existing.sumSqG += g * g;
      existing.sumSqB += b * b;
      existing.count += 1;
    } else {
      binMap.set(key, {
        sumR: r,
        sumG: g,
        sumB: b,
        sumSqR: r * r,
        sumSqG: g * g,
        sumSqB: b * b,
        count: 1
      });
    }
  }

  // Materialise bins sorted deterministically by key
  const bins: ColorBin[] = Array.from(binMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([key, acc]) => ({
      key,
      sumR: acc.sumR,
      sumG: acc.sumG,
      sumB: acc.sumB,
      sumSqR: acc.sumSqR,
      sumSqG: acc.sumSqG,
      sumSqB: acc.sumSqB,
      count: acc.count,
      meanR: acc.sumR / acc.count,
      meanG: acc.sumG / acc.count,
      meanB: acc.sumB / acc.count
    }));

  return {
    bins,
    totalPixels,
    sampledPixels,
    excludedTransparentPixels
  };
}
