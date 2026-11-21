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

// ────────────────────────────────────────────────────────────────────────────
// M9: Patterns, Motifs, Backgrounds, Icons, Component Styles & Decorative Details
// ────────────────────────────────────────────────────────────────────────────

export type VisualElementCategory =
  | 'geometric-motif'
  | 'background-texture'
  | 'icon-symbol'
  | 'component-style'
  | 'decorative-detail';

export type RepetitionStatus = 'recurring' | 'individual';
export type SurfaceBasis = 'directly-visible-surface' | 'inferred-visual-effect';

export interface VisualElementCharacteristics {
  geometry: string;
  surfaceAndColor: string;
  styleTraits: string[];
  visualRole: string;
}

export interface VisualElement {
  id: string;
  name: string;
  category: VisualElementCategory;
  subcategory: string;
  description: string;
  boundingBox: NormalizedBoundingBox;
  additionalLocations: NormalizedBoundingBox[];
  boundaryPrecision: BoundaryPrecision;
  repetitionStatus: RepetitionStatus;
  surfaceBasis: SurfaceBasis;
  characteristics: VisualElementCharacteristics;
  confidence: ConfidenceLevel;
  evidence: string[];
  parentRegionId: string | null;
  parentRegionName: string | null;
  relatedRegionIds: string[];
  occurrenceCount: number;
}

export type PatternRelationshipType =
  | 'repeated-motif'
  | 'shared-component-language'
  | 'recurring-background'
  | 'structural-rhythm';

export interface PatternRelationship {
  id: string;
  name: string;
  patternType: PatternRelationshipType;
  description: string;
  elementIds: string[];
  regionIds: string[];
  occurrenceCount: number;
  confidence: ConfidenceLevel;
  evidence: string[];
}

export type ExplorerTabId =
  | 'all'
  | 'patterns'
  | 'geometric-motif'
  | 'background-texture'
  | 'icon-symbol'
  | 'component-style'
  | 'decorative-detail';

export type InvestigationSelection =
  | { kind: 'region'; id: string }
  | { kind: 'element'; id: string }
  | { kind: 'pattern'; id: string }
  | null;

export interface ElementVisualAssets {
  primaryCropUrl: string | null;
  occurrenceCropUrls: string[];
  measuredColors: RegionMeasuredColor[];
}

export interface InvestigationAssets {
  regionColors: Record<string, RegionMeasuredColor[]>;
  elementAssets: Record<string, ElementVisualAssets>;
}

export interface OverlayVisibility {
  regions: boolean;
  patternsAndMotifs: boolean;
  components: boolean;
}

export interface ElementsAndPatternsValidationSummary {
  elements: VisualElement[];
  patterns: PatternRelationship[];
  rejectedElementCount: number;
  rejectedPatternCount: number;
}

export const ELEMENT_CATEGORY_ORDER: readonly VisualElementCategory[] = [
  'geometric-motif',
  'background-texture',
  'icon-symbol',
  'component-style',
  'decorative-detail'
];

export const ELEMENT_CATEGORY_LABELS: Record<VisualElementCategory, string> = {
  'geometric-motif': 'Geometric Motifs',
  'background-texture': 'Backgrounds & Textures',
  'icon-symbol': 'Icons & Symbols',
  'component-style': 'Component Styles',
  'decorative-detail': 'Decorative Details'
};

export const ELEMENT_CATEGORY_SHORT_LABELS: Record<VisualElementCategory, string> = {
  'geometric-motif': 'Geometric Motif',
  'background-texture': 'Background / Texture',
  'icon-symbol': 'Icon / Symbol',
  'component-style': 'Component Style',
  'decorative-detail': 'Decorative Detail'
};

export const PATTERN_TYPE_LABELS: Record<PatternRelationshipType, string> = {
  'repeated-motif': 'Repeated Motif',
  'shared-component-language': 'Shared Component Style',
  'recurring-background': 'Recurring Surface / Backdrop',
  'structural-rhythm': 'Structural Grid Rhythm'
};

export function isComponentElement(element: VisualElement): boolean {
  return element.category === 'component-style';
}
