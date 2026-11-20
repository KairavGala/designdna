import type { ConfidenceLevel } from './analysis';

export type VisualRegionCategory =
  | 'header-navigation'
  | 'hero'
  | 'main-content'
  | 'text-block'
  | 'media'
  | 'card-container'
  | 'cta-button'
  | 'footer'
  | 'decorative';

export type BoundaryPrecision = 'precise' | 'approximate';

export interface NormalizedBoundingBox {
  /** Normalized left offset in [0, 1] relative to full screenshot width */
  x: number;
  /** Normalized top offset in [0, 1] relative to full screenshot height */
  y: number;
  /** Normalized width in (0, 1] relative to full screenshot width */
  width: number;
  /** Normalized height in (0, 1] relative to full screenshot height */
  height: number;
}

export interface PixelBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RegionObservations {
  typography: string | null;
  layoutAlignment: string;
  shapesAndComponents: string;
  spacingAndComposition: string;
  decorativeElements: string | null;
  designInterpretation: string;
}

export interface RegionMeasuredColor {
  hex: string;
  percentage: number;
  rank: number;
}

export interface VisualRegion {
  id: string;
  name: string;
  category: VisualRegionCategory;
  boundingBox: NormalizedBoundingBox;
  boundaryPrecision: BoundaryPrecision;
  description: string;
  observations: RegionObservations;
  confidence: ConfidenceLevel;
  evidence: string[];
}

export interface RegionValidationSummary {
  regions: VisualRegion[];
  rejectedCount: number;
}

export const REGION_CATEGORY_ORDER: readonly VisualRegionCategory[] = [
  'header-navigation',
  'hero',
  'main-content',
  'card-container',
  'cta-button',
  'text-block',
  'media',
  'footer',
  'decorative'
];

export const REGION_CATEGORY_LABELS: Record<VisualRegionCategory, string> = {
  'header-navigation': 'Header & Navigation',
  hero: 'Hero Section',
  'main-content': 'Main Content',
  'text-block': 'Text Block',
  media: 'Media & Visuals',
  'card-container': 'Cards & Containers',
  'cta-button': 'Buttons & CTAs',
  footer: 'Footer',
  decorative: 'Decorative'
};

export const REGION_CATEGORY_SHORT_LABELS: Record<VisualRegionCategory, string> = {
  'header-navigation': 'Header / Nav',
  hero: 'Hero',
  'main-content': 'Main Content',
  'text-block': 'Text',
  media: 'Media',
  'card-container': 'Card',
  'cta-button': 'CTA',
  footer: 'Footer',
  decorative: 'Decorative'
};
