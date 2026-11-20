import type { UseColorExtractionResult } from '../../hooks/useColorExtraction';
import type { UseVisualAnalysisResult } from '../../hooks/useVisualAnalysis';
import type { ConfidenceLevel } from '../../types/analysis';
import {
  TOKEN_CATEGORY_ORDER,
  type DesignSystem,
  type DesignToken,
  type TokenCategory
} from '../../types/designSystem';
import type { DesignSystemSectionId } from '../../types/navigation';
import type { UploadedImage } from '../../types/upload';

export type DashboardAnalysisStage =
  | 'empty'
  | 'uploaded'
  | 'colors-only'
  | 'complete';

export interface PipelineStepStatus {
  id: 'upload' | 'colors' | 'visual-ai' | 'tokens';
  label: string;
  state: 'completed' | 'active' | 'error' | 'pending';
  detail: string;
}

export interface ProvenanceSummary {
  total: number;
  measured: number;
  aiInferred: number;
  derived: number;
  measuredPct: number;
  aiInferredPct: number;
  derivedPct: number;
}

export interface ConfidenceSummary {
  sourceLabel: string;
  overallConfidence: ConfidenceLevel | null;
  total: number;
  high: number;
  medium: number;
  low: number;
  highPct: number;
  mediumPct: number;
  lowPct: number;
}

export interface DashboardSectionSummary {
  id: DesignSystemSectionId;
  unlocked: boolean;
  metaText: string;
  lockReason: string;
}

export interface DashboardState {
  stage: DashboardAnalysisStage;
  statusLabel: string;
  statusDescription: string;
  unlockedCount: number;
  totalSectionCount: number;
  pipelineSteps: PipelineStepStatus[];
  metrics: {
    colorCount: number | null;
    colorLabel: string;
    typographyCount: number | null;
    spacingCount: number | null;
    totalTokens: number | null;
  };
  provenance: ProvenanceSummary | null;
  confidence: ConfidenceSummary | null;
  categoryCounts: Record<TokenCategory, number>;
  previewTokens: {
    colors: DesignToken[];
    typography: DesignToken[];
    spacing: DesignToken[];
  };
  sections: Record<DesignSystemSectionId, DashboardSectionSummary>;
}

export interface DeriveDashboardInput {
  image: UploadedImage | null;
  colorExtraction: UseColorExtractionResult;
  visualAnalysis: UseVisualAnalysisResult;
  designSystem: DesignSystem | null;
  unlockedSections: ReadonlySet<DesignSystemSectionId>;
}

function toPercentage(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 100);
}

/**
 * Pure selector deriving all dashboard metrics, provenance proportions,
 * confidence counts, pipeline status, and per-section summaries directly
 * from the active M3–M6 state without duplicating extraction or normalisation.
 */
export function deriveDashboardState(input: DeriveDashboardInput): DashboardState {
  const { image, colorExtraction, visualAnalysis, designSystem, unlockedSections } = input;

  const hasColors = Boolean(
    image &&
      colorExtraction.status === 'completed' &&
      colorExtraction.result &&
      colorExtraction.result.colors.length > 0
  );
  const colorResult = hasColors ? colorExtraction.result : null;

  const hasVisualAi = Boolean(
    hasColors && visualAnalysis.status === 'completed' && visualAnalysis.result
  );
  const aiResult = hasVisualAi ? visualAnalysis.result : null;
  const activeDesignSystem = hasVisualAi && designSystem ? designSystem : null;

  const isExtractingColors =
    colorExtraction.status === 'loading' || colorExtraction.status === 'processing';
  const isRunningVisualAi =
    visualAnalysis.status === 'preparing' || visualAnalysis.status === 'analyzing';

  let stage: DashboardAnalysisStage = 'empty';
  let statusLabel = 'No active analysis';
  let statusDescription =
    'Upload a website screenshot to extract measured colours, AI visual structure, and normalised design tokens.';

  if (activeDesignSystem) {
    stage = 'complete';
    statusLabel = 'Analysis complete';
    statusDescription = `All ${unlockedSections.size} of 7 Design System sections are ready to inspect from ${image?.name ?? 'your screenshot'}.`;
  } else if (hasColors) {
    stage = 'colors-only';
    statusLabel = isRunningVisualAi
      ? 'Running AI Visual Interpretation'
      : 'Measured colours ready';
    statusDescription = isRunningVisualAi
      ? 'Analysing typography, spacing, layout, components, and effects with Gemini.'
      : 'Measured palette extracted locally. Run AI Visual Interpretation to unlock typography, spacing, layout, components, effects, and normalised design tokens.';
  } else if (image) {
    stage = 'uploaded';
    statusLabel = isExtractingColors ? 'Extracting measured colours' : 'Screenshot uploaded';
    statusDescription = isExtractingColors
      ? 'Sampling screenshot pixels locally in your browser.'
      : 'Screenshot validated in browser memory. Run local colour extraction to begin analysis.';
  }

  const pipelineSteps: PipelineStepStatus[] = [
    {
      id: 'upload',
      label: 'Screenshot',
      state: image ? 'completed' : 'pending',
      detail: image ? `${image.width} × ${image.height}px` : 'Awaiting upload'
    },
    {
      id: 'colors',
      label: 'Measured Colours',
      state: hasColors
        ? 'completed'
        : isExtractingColors
          ? 'active'
          : colorExtraction.status === 'error'
            ? 'error'
            : 'pending',
      detail: colorResult
        ? `${colorResult.colors.length} clusters`
        : isExtractingColors
          ? 'Sampling pixels'
          : colorExtraction.status === 'error'
            ? 'Extraction failed'
            : 'Not extracted'
    },
    {
      id: 'visual-ai',
      label: 'Visual AI',
      state: hasVisualAi
        ? 'completed'
        : isRunningVisualAi
          ? 'active'
          : visualAnalysis.status === 'error'
            ? 'error'
            : 'pending',
      detail: aiResult
        ? aiResult.meta.model
        : isRunningVisualAi
          ? 'Interpreting UI'
          : visualAnalysis.status === 'error'
            ? 'Needs attention'
            : 'Not run'
    },
    {
      id: 'tokens',
      label: 'Design Tokens',
      state: activeDesignSystem ? 'completed' : 'pending',
      detail: activeDesignSystem
        ? `${activeDesignSystem.metrics.totalTokens} tokens`
        : 'Awaiting Visual AI'
    }
  ];

  // Key counts strictly from live M4 / M6 data
  const metrics = {
    colorCount: activeDesignSystem
      ? activeDesignSystem.byCategory.color.length
      : colorResult
        ? colorResult.colors.length
        : null,
    colorLabel: activeDesignSystem ? 'Colour tokens' : 'Measured colours',
    typographyCount: activeDesignSystem ? activeDesignSystem.byCategory.typography.length : null,
    spacingCount: activeDesignSystem ? activeDesignSystem.byCategory.spacing.length : null,
    totalTokens: activeDesignSystem ? activeDesignSystem.metrics.totalTokens : null
  };

  // Provenance breakdown
  let provenance: ProvenanceSummary | null = null;
  if (activeDesignSystem) {
    const total = activeDesignSystem.metrics.totalTokens;
    const measured = activeDesignSystem.metrics.measuredCount;
    const aiInferred = activeDesignSystem.metrics.aiInferredCount;
    const derived = activeDesignSystem.metrics.derivedCount;
    provenance = {
      total,
      measured,
      aiInferred,
      derived,
      measuredPct: toPercentage(measured, total),
      aiInferredPct: toPercentage(aiInferred, total),
      derivedPct: toPercentage(derived, total)
    };
  } else if (colorResult) {
    const total = colorResult.colors.length;
    provenance = {
      total,
      measured: total,
      aiInferred: 0,
      derived: 0,
      measuredPct: 100,
      aiInferredPct: 0,
      derivedPct: 0
    };
  }

  // Confidence overview strictly from existing token confidence or measured palette reliability
  let confidence: ConfidenceSummary | null = null;
  if (activeDesignSystem && activeDesignSystem.tokens.length > 0) {
    let high = 0;
    let medium = 0;
    let low = 0;
    for (const token of activeDesignSystem.tokens) {
      if (token.confidence === 'high') high += 1;
      else if (token.confidence === 'medium') medium += 1;
      else low += 1;
    }
    const total = activeDesignSystem.tokens.length;
    confidence = {
      sourceLabel: 'Across normalised design tokens',
      overallConfidence: activeDesignSystem.summary.overallConfidence,
      total,
      high,
      medium,
      low,
      highPct: toPercentage(high, total),
      mediumPct: toPercentage(medium, total),
      lowPct: toPercentage(low, total)
    };
  } else if (colorResult && colorResult.colors.length > 0) {
    let high = 0;
    let medium = 0;
    let low = 0;
    for (const color of colorResult.colors) {
      if (color.reliability === 'high') high += 1;
      else if (color.reliability === 'medium') medium += 1;
      else low += 1;
    }
    const total = colorResult.colors.length;
    confidence = {
      sourceLabel: 'Measured palette cluster reliability',
      overallConfidence: null,
      total,
      high,
      medium,
      low,
      highPct: toPercentage(high, total),
      mediumPct: toPercentage(medium, total),
      lowPct: toPercentage(low, total)
    };
  }

  const categoryCounts: Record<TokenCategory, number> = {
    color: 0,
    typography: 0,
    spacing: 0,
    radius: 0,
    border: 0,
    shadow: 0,
    layout: 0
  };
  if (activeDesignSystem) {
    for (const category of TOKEN_CATEGORY_ORDER) {
      categoryCounts[category] = activeDesignSystem.byCategory[category].length;
    }
  }

  const previewTokens = {
    colors: activeDesignSystem ? activeDesignSystem.byCategory.color.slice(0, 8) : [],
    typography: activeDesignSystem ? activeDesignSystem.byCategory.typography.slice(0, 4) : [],
    spacing: activeDesignSystem ? activeDesignSystem.byCategory.spacing.slice(0, 5) : []
  };

  const interp = aiResult?.interpretation ?? null;

  const sections: Record<DesignSystemSectionId, DashboardSectionSummary> = {
    colors: {
      id: 'colors',
      unlocked: unlockedSections.has('colors'),
      metaText: colorResult
        ? `${colorResult.colors.length} measured${interp ? ` · ${interp.semanticColors.length} semantic roles` : ''}`
        : 'Measured palette & semantic roles',
      lockReason: image
        ? 'Run colour extraction to unlock'
        : 'Upload a screenshot to unlock'
    },
    typography: {
      id: 'typography',
      unlocked: unlockedSections.has('typography'),
      metaText: interp
        ? `${interp.typography.hierarchy.length} hierarchy levels · ${interp.typography.headingFontStyle}`
        : 'Type scale & font classification',
      lockReason: hasColors
        ? 'Run AI Visual Interpretation to unlock'
        : 'Requires colour extraction & Visual AI'
    },
    spacing: {
      id: 'spacing',
      unlocked: unlockedSections.has('spacing'),
      metaText: interp
        ? `${interp.spacing.baseUnit} base · ${interp.spacing.density} density`
        : 'Base unit & spacing rhythm',
      lockReason: hasColors
        ? 'Run AI Visual Interpretation to unlock'
        : 'Requires colour extraction & Visual AI'
    },
    components: {
      id: 'components',
      unlocked: unlockedSections.has('components'),
      metaText: interp
        ? `${interp.components.length} detected UI ${interp.components.length === 1 ? 'component' : 'components'}`
        : 'Buttons, cards & interactive anatomy',
      lockReason: hasColors
        ? 'Run AI Visual Interpretation to unlock'
        : 'Requires colour extraction & Visual AI'
    },
    layout: {
      id: 'layout',
      unlocked: unlockedSections.has('layout'),
      metaText: interp
        ? `${interp.layout.gridColumns} · ${interp.layout.regions.length} structural regions`
        : 'Grid columns & page regions',
      lockReason: hasColors
        ? 'Run AI Visual Interpretation to unlock'
        : 'Requires colour extraction & Visual AI'
    },
    effects: {
      id: 'effects',
      unlocked: unlockedSections.has('effects'),
      metaText: interp
        ? `${interp.effects.elevationStyle.replace(/-/g, ' ')} · ${interp.effects.borderRadiusScale.length} radius steps`
        : 'Elevation, borders & corner radii',
      lockReason: hasColors
        ? 'Run AI Visual Interpretation to unlock'
        : 'Requires colour extraction & Visual AI'
    },
    'design-tokens': {
      id: 'design-tokens',
      unlocked: unlockedSections.has('design-tokens'),
      metaText: activeDesignSystem
        ? `${activeDesignSystem.metrics.totalTokens} tokens · CSS & JSON ready`
        : 'Unified semantic CSS & JSON tokens',
      lockReason: hasColors
        ? 'Run AI Visual Interpretation to unlock'
        : 'Requires colour extraction & Visual AI'
    }
  };

  return {
    stage,
    statusLabel,
    statusDescription,
    unlockedCount: unlockedSections.size,
    totalSectionCount: 7,
    pipelineSteps,
    metrics,
    provenance,
    confidence,
    categoryCounts,
    previewTokens,
    sections
  };
}
