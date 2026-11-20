import type { VisualRegion } from './investigation';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type SemanticColorRole =
  | 'background'
  | 'surface'
  | 'primary_text'
  | 'secondary_text'
  | 'primary_brand'
  | 'accent'
  | 'border'
  | 'semantic_status';

export interface SemanticColorAssignment {
  role: SemanticColorRole;
  label: string;
  hex: string;
  matchedMeasuredHex: string | null;
  rationale: string;
  confidence: ConfidenceLevel;
}

export interface TypographyHierarchyItem {
  level: string;
  estimatedSize: string;
  estimatedWeight: string;
  lineHeight: string;
  usage: string;
  confidence: ConfidenceLevel;
}

export interface SpacingScaleStep {
  token: string;
  value: string;
  usage: string;
}

export type ComponentCategory =
  | 'navigation'
  | 'button'
  | 'card'
  | 'input'
  | 'badge'
  | 'table'
  | 'modal'
  | 'other';

export interface DetectedComponent {
  name: string;
  category: ComponentCategory;
  visualTreatment: string;
  borderRadius: string;
  emphasis: string;
  confidence: ConfidenceLevel;
}

export interface LayoutRegion {
  name: string;
  role: string;
  proportion: string;
}

export interface BorderRadiusItem {
  label: string;
  value: string;
  usage: string;
}

export interface VisualInterpretation {
  summary: {
    styleSummary: string;
    designTone: string;
    interfaceType: string;
    themeMode: 'light' | 'dark' | 'mixed';
    overallConfidence: ConfidenceLevel;
  };
  semanticColors: SemanticColorAssignment[];
  typography: {
    headingFontStyle: string;
    bodyFontStyle: string;
    monospaceDetected: boolean;
    scaleSummary: string;
    hierarchy: TypographyHierarchyItem[];
    confidence: ConfidenceLevel;
  };
  spacing: {
    baseUnit: string;
    density: 'compact' | 'comfortable' | 'spacious';
    sectionRhythm: string;
    containerPadding: string;
    scaleSteps: SpacingScaleStep[];
    confidence: ConfidenceLevel;
  };
  components: DetectedComponent[];
  layout: {
    structureType: string;
    gridColumns: string;
    alignment: string;
    contentWidth: string;
    regions: LayoutRegion[];
    confidence: ConfidenceLevel;
  };
  effects: {
    elevationStyle: 'flat' | 'subtle-border' | 'layered-shadow' | 'glass';
    borderStyle: string;
    shadowStyle: string;
    borderRadiusScale: BorderRadiusItem[];
    notes: string;
    confidence: ConfidenceLevel;
  };
  visualRegions?: VisualRegion[];
}

export interface VisualAnalysisMeta {
  model: string;
  durationMs: number;
  analyzedAt: string;
}

export interface VisualAnalysisResult {
  interpretation: VisualInterpretation;
  meta: VisualAnalysisMeta;
}

export type VisualAnalysisStatus =
  | 'idle'
  | 'preparing'
  | 'analyzing'
  | 'completed'
  | 'error';

export type VisualAnalysisStage = 'preparing' | 'analyzing';

export interface VisualAnalysisErrorDetails {
  upstreamStatus?: number;
  geminiStatus?: string;
  model?: string;
  quotaMetric?: string;
  quotaId?: string;
  quotaLimit?: string;
  retryDelay?: string;
  upstreamMessage?: string;
}

export interface VisualAnalysisError {
  code: string;
  title: string;
  message: string;
  details?: VisualAnalysisErrorDetails;
}

export interface VisualAnalysisRequestPayload {
  imageBase64: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  fileName: string;
  dimensions: {
    width: number;
    height: number;
  };
  measuredPalette: Array<{
    hex: string;
    percentage: number;
    rank: number;
  }>;
}
