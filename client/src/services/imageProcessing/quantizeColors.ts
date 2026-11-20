import type {
  ColorReliability,
  ExtractedColor,
  LabColor,
  RGBColor
} from '../../types/colors';
import { deltaE76, rgbToHex, rgbToHsl, rgbToLab } from './colorConversions';
import type { ColorBin } from './extractPixels';

interface Bucket {
  bins: ColorBin[];
  totalCount: number;
  rangeR: number;
  rangeG: number;
  rangeB: number;
  maxRange: number;
  widestChannel: 'r' | 'g' | 'b';
}

interface RawCluster {
  sumR: number;
  sumG: number;
  sumB: number;
  sumSqR: number;
  sumSqG: number;
  sumSqB: number;
  pixelCount: number;
  rgb: RGBColor;
  lab: LabColor;
}

function buildBucket(bins: ColorBin[]): Bucket {
  let minR = 255;
  let maxR = 0;
  let minG = 255;
  let maxG = 0;
  let minB = 255;
  let maxB = 0;
  let totalCount = 0;

  for (const bin of bins) {
    if (bin.meanR < minR) minR = bin.meanR;
    if (bin.meanR > maxR) maxR = bin.meanR;
    if (bin.meanG < minG) minG = bin.meanG;
    if (bin.meanG > maxG) maxG = bin.meanG;
    if (bin.meanB < minB) minB = bin.meanB;
    if (bin.meanB > maxB) maxB = bin.meanB;
    totalCount += bin.count;
  }

  const rangeR = maxR - minR;
  const rangeG = maxG - minG;
  const rangeB = maxB - minB;

  let widestChannel: 'r' | 'g' | 'b' = 'r';
  let maxRange = rangeR;
  if (rangeG > maxRange) {
    widestChannel = 'g';
    maxRange = rangeG;
  }
  if (rangeB > maxRange) {
    widestChannel = 'b';
    maxRange = rangeB;
  }

  return {
    bins,
    totalCount,
    rangeR,
    rangeG,
    rangeB,
    maxRange,
    widestChannel
  };
}

function splitBucketWeightedMedian(bucket: Bucket): [Bucket, Bucket] | null {
  if (bucket.bins.length < 2 || bucket.maxRange === 0) {
    return null;
  }

  const channel = bucket.widestChannel;
  const sorted = [...bucket.bins].sort((a, b) => {
    const valA = channel === 'r' ? a.meanR : channel === 'g' ? a.meanG : a.meanB;
    const valB = channel === 'r' ? b.meanR : channel === 'g' ? b.meanG : b.meanB;
    if (valA !== valB) return valA - valB;
    return a.key - b.key;
  });

  const halfWeight = bucket.totalCount / 2;
  let running = 0;
  let splitIndex = 1;

  for (let i = 0; i < sorted.length - 1; i++) {
    running += sorted[i].count;
    if (running >= halfWeight) {
      splitIndex = i + 1;
      break;
    }
  }

  const leftBins = sorted.slice(0, splitIndex);
  const rightBins = sorted.slice(splitIndex);
  if (leftBins.length === 0 || rightBins.length === 0) {
    return null;
  }

  return [buildBucket(leftBins), buildBucket(rightBins)];
}

function createClusterFromBins(bins: ColorBin[]): RawCluster {
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let sumSqR = 0;
  let sumSqG = 0;
  let sumSqB = 0;
  let pixelCount = 0;

  for (const bin of bins) {
    sumR += bin.sumR;
    sumG += bin.sumG;
    sumB += bin.sumB;
    sumSqR += bin.sumSqR;
    sumSqG += bin.sumSqG;
    sumSqB += bin.sumSqB;
    pixelCount += bin.count;
  }

  const rgb: RGBColor = {
    r: Math.round(sumR / pixelCount),
    g: Math.round(sumG / pixelCount),
    b: Math.round(sumB / pixelCount)
  };

  return {
    sumR,
    sumG,
    sumB,
    sumSqR,
    sumSqG,
    sumSqB,
    pixelCount,
    rgb,
    lab: rgbToLab(rgb)
  };
}

/**
 * Refines deterministic median-cut seeds via weighted K-Means iterations
 * over the histogram bins (zero randomness, converges quickly).
 */
function refineClustersWeightedKMeans(
  bins: ColorBin[],
  initialClusters: RawCluster[],
  maxIterations = 10
): RawCluster[] {
  if (initialClusters.length <= 1) return initialClusters;

  let centroids = initialClusters.map((c) => ({
    r: c.sumR / c.pixelCount,
    g: c.sumG / c.pixelCount,
    b: c.sumB / c.pixelCount
  }));

  const assignments = new Int32Array(bins.length).fill(-1);

  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false;

    const k = centroids.length;
    const sumR = new Float64Array(k);
    const sumG = new Float64Array(k);
    const sumB = new Float64Array(k);
    const sumSqR = new Float64Array(k);
    const sumSqG = new Float64Array(k);
    const sumSqB = new Float64Array(k);
    const counts = new Float64Array(k);

    for (let i = 0; i < bins.length; i++) {
      const bin = bins[i];
      let bestIdx = 0;
      let bestDist = Infinity;

      for (let c = 0; c < k; c++) {
        const dr = bin.meanR - centroids[c].r;
        const dg = bin.meanG - centroids[c].g;
        const db = bin.meanB - centroids[c].b;
        const dist = dr * dr + dg * dg + db * db;
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = c;
        }
      }

      if (assignments[i] !== bestIdx) {
        assignments[i] = bestIdx;
        changed = true;
      }

      sumR[bestIdx] += bin.sumR;
      sumG[bestIdx] += bin.sumG;
      sumB[bestIdx] += bin.sumB;
      sumSqR[bestIdx] += bin.sumSqR;
      sumSqG[bestIdx] += bin.sumSqG;
      sumSqB[bestIdx] += bin.sumSqB;
      counts[bestIdx] += bin.count;
    }

    const nextCentroids: Array<{ r: number; g: number; b: number }> = [];
    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        nextCentroids.push({
          r: sumR[c] / counts[c],
          g: sumG[c] / counts[c],
          b: sumB[c] / counts[c]
        });
      }
    }

    if (!changed || iter === maxIterations - 1) {
      const refined: RawCluster[] = [];
      for (let c = 0; c < k; c++) {
        if (counts[c] <= 0) continue;
        const rgb: RGBColor = {
          r: Math.round(sumR[c] / counts[c]),
          g: Math.round(sumG[c] / counts[c]),
          b: Math.round(sumB[c] / counts[c])
        };
        refined.push({
          sumR: sumR[c],
          sumG: sumG[c],
          sumB: sumB[c],
          sumSqR: sumSqR[c],
          sumSqG: sumSqG[c],
          sumSqB: sumSqB[c],
          pixelCount: counts[c],
          rgb,
          lab: rgbToLab(rgb)
        });
      }
      return refined;
    }

    centroids = nextCentroids;
  }

  return initialClusters;
}

/**
 * Deterministically merges perceptually close clusters (CIE76 Delta-E <= threshold)
 * in descending pixel-frequency order so near-identical anti-aliased or gradient
 * shades coalesce without creating duplicate swatches.
 */
function mergeSimilarClusters(
  clusters: RawCluster[],
  mergeThreshold: number
): RawCluster[] {
  const sorted = [...clusters].sort((a, b) => {
    if (b.pixelCount !== a.pixelCount) return b.pixelCount - a.pixelCount;
    return rgbToHex(a.rgb).localeCompare(rgbToHex(b.rgb));
  });

  const merged: RawCluster[] = [];

  for (const candidate of sorted) {
    let targetIndex = -1;
    let closestDistance = Infinity;

    for (let i = 0; i < merged.length; i++) {
      const dist = deltaE76(candidate.lab, merged[i].lab);
      if (dist <= mergeThreshold && dist < closestDistance) {
        closestDistance = dist;
        targetIndex = i;
      }
    }

    if (targetIndex === -1) {
      merged.push({ ...candidate });
    } else {
      const target = merged[targetIndex];
      const totalCount = target.pixelCount + candidate.pixelCount;
      const sumR = target.sumR + candidate.sumR;
      const sumG = target.sumG + candidate.sumG;
      const sumB = target.sumB + candidate.sumB;
      const rgb: RGBColor = {
        r: Math.round(sumR / totalCount),
        g: Math.round(sumG / totalCount),
        b: Math.round(sumB / totalCount)
      };

      merged[targetIndex] = {
        sumR,
        sumG,
        sumB,
        sumSqR: target.sumSqR + candidate.sumSqR,
        sumSqG: target.sumSqG + candidate.sumSqG,
        sumSqB: target.sumSqB + candidate.sumSqB,
        pixelCount: totalCount,
        rgb,
        lab: rgbToLab(rgb)
      };
    }
  }

  return merged;
}

function computeClusterSpread(cluster: RawCluster): number {
  const n = cluster.pixelCount;
  if (n <= 1) return 0;

  const meanR = cluster.sumR / n;
  const meanG = cluster.sumG / n;
  const meanB = cluster.sumB / n;

  const varR = Math.max(0, cluster.sumSqR / n - meanR * meanR);
  const varG = Math.max(0, cluster.sumSqG / n - meanG * meanG);
  const varB = Math.max(0, cluster.sumSqB / n - meanB * meanB);

  return Math.round(Math.sqrt(varR + varG + varB) * 10) / 10;
}

function classifyReliability(spread: number): ColorReliability {
  if (spread <= 10) return 'high';
  if (spread <= 26) return 'medium';
  return 'low';
}

export interface QuantizeOptions {
  sampledPixels: number;
  maxColors: number;
  mergeThreshold: number;
  minPercentage: number;
}

export interface QuantizeResult {
  colors: ExtractedColor[];
  coveragePercentage: number;
}

/**
 * Deterministic 3-stage palette quantization:
 * 1. Weighted Median-Cut partitioning over 5-bit RGB histogram bins.
 * 2. Deterministic Weighted K-Means centroid refinement.
 * 3. Perceptual CIE Lab Delta-E post-merge + frequency ranking.
 *
 * Guarantees identical output for identical input and naturally returns fewer
 * swatches when an interface contains fewer distinct colours.
 */
export function quantizeColors(
  bins: ColorBin[],
  options: QuantizeOptions
): QuantizeResult {
  if (bins.length === 0 || options.sampledPixels <= 0) {
    return { colors: [], coveragePercentage: 0 };
  }

  // Stage 1: Deterministic weighted median-cut up to 2x target palette slots
  const initialTargetBuckets = Math.min(bins.length, Math.max(options.maxColors * 2, 16));
  const buckets: Bucket[] = [buildBucket(bins)];

  while (buckets.length < initialTargetBuckets) {
    let bestIdx = -1;
    let bestScore = 0;

    for (let i = 0; i < buckets.length; i++) {
      const b = buckets[i];
      if (b.bins.length < 2 || b.maxRange === 0) continue;
      // Score balances colour spread and pixel weight so neither tiny noise nor flat blocks dominate splits
      const score = b.maxRange * Math.sqrt(b.totalCount);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) break;

    const split = splitBucketWeightedMedian(buckets[bestIdx]);
    if (!split) break;

    buckets.splice(bestIdx, 1, split[0], split[1]);
  }

  const initialClusters = buckets.map((b) => createClusterFromBins(b.bins));

  // Stage 2: Deterministic weighted K-Means refinement
  const refinedClusters = refineClustersWeightedKMeans(bins, initialClusters, 10);

  // Stage 3: Perceptual CIE Lab post-merge
  const mergedClusters = mergeSimilarClusters(refinedClusters, options.mergeThreshold);

  // Rank descending by pixel frequency (deterministic tie-break by HEX)
  const ranked = [...mergedClusters].sort((a, b) => {
    if (b.pixelCount !== a.pixelCount) return b.pixelCount - a.pixelCount;
    return rgbToHex(a.rgb).localeCompare(rgbToHex(b.rgb));
  });

  // Keep meaningful clusters above minPercentage (always retain at least 1 colour)
  const meaningful = ranked.filter((cluster, index) => {
    if (index === 0) return true;
    const pct = (cluster.pixelCount / options.sampledPixels) * 100;
    return pct >= options.minPercentage;
  });

  const selected = meaningful.slice(0, options.maxColors);

  const colors: ExtractedColor[] = selected.map((cluster, index) => {
    const hex = rgbToHex(cluster.rgb);
    const hsl = rgbToHsl(cluster.rgb);
    const rawPercentage = (cluster.pixelCount / options.sampledPixels) * 100;
    const percentage = Math.round(rawPercentage * 10) / 10;
    const spread = computeClusterSpread(cluster);

    return {
      id: `color-${index + 1}-${hex.slice(1).toLowerCase()}`,
      hex,
      rgb: cluster.rgb,
      hsl,
      pixelCount: cluster.pixelCount,
      percentage,
      rank: index + 1,
      reliability: classifyReliability(spread),
      intraClusterSpread: spread
    };
  });

  const exactSelectedPixels = selected.reduce((sum, c) => sum + c.pixelCount, 0);
  const coveragePercentage = Math.min(
    100,
    Math.round((exactSelectedPixels / options.sampledPixels) * 1000) / 10
  );

  return { colors, coveragePercentage };
}
