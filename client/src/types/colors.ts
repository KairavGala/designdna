export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface HSLColor {
  h: number;
  s: number;
  l: number;
}

export interface LabColor {
  l: number;
  a: number;
  b: number;
}

export type ColorReliability = 'high' | 'medium' | 'low';

export interface ExtractedColor {
  id: string;
  hex: string;
  rgb: RGBColor;
  hsl: HSLColor;
  pixelCount: number;
  percentage: number;
  rank: number;
  reliability: ColorReliability;
  intraClusterSpread: number;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ExtractionStatistics {
  originalDimensions: ImageDimensions;
  processedDimensions: ImageDimensions;
  totalPixels: number;
  sampledPixels: number;
  excludedTransparentPixels: number;
  uniqueQuantizedBins: number;
  coveragePercentage: number;
  durationMs: number;
  method: string;
}

export interface PaletteExtractionResult {
  sourceFileName: string;
  colors: ExtractedColor[];
  statistics: ExtractionStatistics;
}

export type ExtractionStatus =
  | 'idle'
  | 'loading'
  | 'processing'
  | 'completed'
  | 'error';

export type ExtractionStage =
  | 'decoding'
  | 'downsampling'
  | 'sampling'
  | 'clustering';

export type ExtractionErrorCode =
  | 'MISSING_IMAGE'
  | 'DECODE_ERROR'
  | 'CANVAS_UNAVAILABLE'
  | 'CANVAS_SECURITY_ERROR'
  | 'EMPTY_PIXEL_DATA'
  | 'UNEXPECTED_ERROR';

export interface ExtractionError {
  code: ExtractionErrorCode;
  title: string;
  message: string;
}

export interface ColorExtractionOptions {
  /** Maximum width or height for downsampled processing canvas (default: 288) */
  maxDimension?: number;
  /** Minimum alpha value (0–255) for a pixel to be sampled (default: 128) */
  minAlpha?: number;
  /** Maximum number of representative colours returned (default: 10) */
  maxColors?: number;
  /** CIE76 Lab Delta-E merge threshold for visually similar clusters (default: 10) */
  mergeThreshold?: number;
  /** Minimum pixel percentage for keeping minor tail clusters (default: 0.25) */
  minPercentage?: number;
  /** Stage callback for honest progress updates */
  onStage?: (stage: ExtractionStage) => void;
}

export const DEFAULT_EXTRACTION_OPTIONS = {
  maxDimension: 288,
  minAlpha: 128,
  maxColors: 10,
  mergeThreshold: 10,
  minPercentage: 0.25
} as const;
