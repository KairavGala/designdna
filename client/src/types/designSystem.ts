import type { ConfidenceLevel } from './analysis';

export type TokenCategory =
  | 'color'
  | 'typography'
  | 'spacing'
  | 'radius'
  | 'border'
  | 'shadow'
  | 'layout';

export type TokenProvenance = 'measured' | 'ai-inferred' | 'derived';

export type ReconciliationStatus =
  | 'aligned'
  | 'anchored-to-measured'
  | 'conflict-preserved'
  | 'ai-only';

export interface TokenEvidence {
  source: string;
  measuredHex?: string;
  pixelPercentage?: number;
  measuredRank?: number;
  aiRole?: string;
  aiEstimate?: string;
  deltaE?: number;
  contrastRatio?: number;
  notes: string[];
}

export interface TokenReconciliation {
  status: ReconciliationStatus;
  measuredValue?: string;
  aiSuggestedValue?: string;
  resolution: string;
}

export interface DesignToken {
  id: string;
  name: string;
  cssVariable: string;
  category: TokenCategory;
  cssType: 'color' | 'fontFamily' | 'dimension' | 'fontWeight' | 'number' | 'border' | 'shadow' | 'other';
  value: string;
  rawValue?: string;
  provenance: TokenProvenance;
  confidence: ConfidenceLevel;
  description: string;
  evidence: TokenEvidence;
  reconciliation?: TokenReconciliation;
}

export interface DesignSystemReconciliationNote {
  id: string;
  category: TokenCategory;
  tokenName: string;
  kind: 'anchored-to-measured' | 'conflict-preserved' | 'deduplicated';
  measuredValue?: string;
  aiSuggestedValue?: string;
  finalValue: string;
  explanation: string;
}

export interface DesignTokenJsonLeaf {
  $value: string;
  $type: DesignToken['cssType'];
  $description: string;
  $extensions: {
    designdna: {
      id: string;
      cssVariable: string;
      provenance: TokenProvenance;
      confidence: ConfidenceLevel;
      evidence: TokenEvidence;
      reconciliation?: TokenReconciliation;
    };
  };
}

export interface DesignTokensJsonDocument {
  $schema: string;
  $metadata: {
    generator: 'DesignDNA';
    schemaVersion: '1.0.0';
    sourceFile: string;
    dimensions: {
      width: number;
      height: number;
    };
    aiModel: string | null;
    tokenCount: number;
  };
  tokens: Record<TokenCategory, Record<string, DesignTokenJsonLeaf>>;
}

export interface DesignSystemSourceInfo {
  fileName: string;
  format: string;
  width: number;
  height: number;
  colorExtractionMethod: string;
  aiModel: string | null;
  hasAiInterpretation: boolean;
}

export interface DesignSystemSummary {
  styleSummary: string;
  designTone: string;
  interfaceType: string;
  themeMode: 'light' | 'dark' | 'mixed';
  overallConfidence: ConfidenceLevel;
}

export interface DesignSystemMetrics {
  totalTokens: number;
  measuredCount: number;
  aiInferredCount: number;
  derivedCount: number;
  deduplicatedCount: number;
  conflictCount: number;
}

export interface DesignSystem {
  schemaVersion: '1.0.0';
  source: DesignSystemSourceInfo;
  summary: DesignSystemSummary;
  tokens: DesignToken[];
  byCategory: Record<TokenCategory, DesignToken[]>;
  reconciliationNotes: DesignSystemReconciliationNote[];
  metrics: DesignSystemMetrics;
  cssVariables: string;
  jsonBundle: DesignTokensJsonDocument;
}

export const TOKEN_CATEGORY_ORDER: readonly TokenCategory[] = [
  'color',
  'typography',
  'spacing',
  'radius',
  'border',
  'shadow',
  'layout'
] as const;

export const TOKEN_CATEGORY_LABELS: Record<TokenCategory, string> = {
  color: 'Colors',
  typography: 'Typography',
  spacing: 'Spacing',
  radius: 'Border Radii',
  border: 'Borders',
  shadow: 'Shadows',
  layout: 'Layout'
};

export const PROVENANCE_LABELS: Record<TokenProvenance, string> = {
  measured: 'Measured',
  'ai-inferred': 'AI-Inferred',
  derived: 'Derived'
};
