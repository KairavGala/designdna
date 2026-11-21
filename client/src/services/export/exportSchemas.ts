import { z } from 'zod';

const confidenceSchema = z.enum(['high', 'medium', 'low']);
const provenanceSchema = z.enum(['measured', 'ai-inferred', 'derived']);
const tokenCategorySchema = z.enum([
  'color',
  'typography',
  'spacing',
  'radius',
  'border',
  'shadow',
  'layout'
]);

const tokenLeafSchema = z.object({
  $value: z.string().min(1),
  $type: z.string().min(1),
  $description: z.string(),
  $extensions: z.object({
    designdna: z.object({
      id: z.string().min(1),
      cssVariable: z.string().regex(/^--ddna-[a-z0-9-]+$/),
      provenance: provenanceSchema,
      confidence: confidenceSchema,
      evidence: z.object({
        source: z.string().min(1),
        measuredHex: z.string().optional(),
        pixelPercentage: z.number().optional(),
        measuredRank: z.number().optional(),
        aiRole: z.string().optional(),
        aiEstimate: z.string().optional(),
        deltaE: z.number().optional(),
        contrastRatio: z.number().optional(),
        notes: z.array(z.string())
      }),
      reconciliation: z
        .object({
          status: z.string().min(1),
          measuredValue: z.string().optional(),
          aiSuggestedValue: z.string().optional(),
          resolution: z.string().min(1)
        })
        .optional()
    })
  })
});

export const structuredJsonExportSchema = z.object({
  $schema: z.string().url(),
  $metadata: z.object({
    generator: z.literal('DesignDNA'),
    schemaVersion: z.literal('1.0.0'),
    exportVersion: z.literal('1.0.0'),
    sourceFile: z.string().min(1),
    dimensions: z.object({
      width: z.number().int().positive(),
      height: z.number().int().positive()
    }),
    aiModel: z.string().nullable(),
    hasAiInterpretation: z.boolean(),
    tokenCount: z.number().int().nonnegative()
  }),
  summary: z.object({
    styleSummary: z.string().min(1),
    designTone: z.string().min(1),
    interfaceType: z.string().min(1),
    themeMode: z.enum(['light', 'dark', 'mixed']),
    overallConfidence: confidenceSchema,
    styleClassifications: z.array(
      z.object({
        label: z.string().min(1),
        rationale: z.string().min(1),
        provenance: provenanceSchema,
        confidence: confidenceSchema
      })
    )
  }),
  metrics: z.object({
    totalTokens: z.number().int().nonnegative(),
    measuredCount: z.number().int().nonnegative(),
    aiInferredCount: z.number().int().nonnegative(),
    derivedCount: z.number().int().nonnegative(),
    deduplicatedCount: z.number().int().nonnegative(),
    conflictCount: z.number().int().nonnegative()
  }),
  categories: z.array(tokenCategorySchema),
  tokens: z.object({
    color: z.record(z.string(), tokenLeafSchema),
    typography: z.record(z.string(), tokenLeafSchema),
    spacing: z.record(z.string(), tokenLeafSchema),
    radius: z.record(z.string(), tokenLeafSchema),
    border: z.record(z.string(), tokenLeafSchema),
    shadow: z.record(z.string(), tokenLeafSchema),
    layout: z.record(z.string(), tokenLeafSchema)
  }),
  reconciliation: z.array(
    z.object({
      id: z.string().min(1),
      category: tokenCategorySchema,
      tokenName: z.string().min(1),
      kind: z.enum(['anchored-to-measured', 'conflict-preserved', 'deduplicated']),
      measuredValue: z.string().optional(),
      aiSuggestedValue: z.string().optional(),
      finalValue: z.string().min(1),
      explanation: z.string().min(1)
    })
  ),
  visualAnalysisSummary: z.object({
    populatedBoardSections: z.number().int().min(0).max(7),
    totalBoardSections: z.literal(7),
    detectedRegionsCount: z.number().int().nonnegative(),
    detectedVisualElementsCount: z.number().int().nonnegative(),
    verifiedPatternsCount: z.number().int().nonnegative(),
    methodologyNote: z.string().min(1)
  })
});

export const visualAssetManifestEntrySchema = z.object({
  id: z.string().min(1),
  path: z.string().min(1),
  folder: z.enum(['motifs', 'components', 'patterns', 'source']),
  filename: z.string().min(1),
  category: z.string().min(1),
  sourceFindingId: z.string().nullable(),
  sourceFindingName: z.string().min(1),
  parentRegionName: z.string().nullable(),
  provenance: provenanceSchema,
  confidence: confidenceSchema,
  occurrenceIndex: z.number().int().positive().nullable(),
  pixelDimensions: z
    .object({
      width: z.number().int().positive(),
      height: z.number().int().positive()
    })
    .nullable(),
  measuredColors: z.array(
    z.object({
      hex: z.string().regex(/^#[0-9A-F]{6}$/i),
      percentage: z.number().min(0).max(100)
    })
  )
});

export const visualAssetsManifestSchema = z.object({
  generator: z.literal('DesignDNA'),
  manifestVersion: z.literal('1.0.0'),
  generatedAt: z.string().min(1),
  sourceFile: z.string().min(1),
  includesOriginalScreenshot: z.boolean(),
  totalAssets: z.number().int().nonnegative(),
  assets: z.array(visualAssetManifestEntrySchema)
});

export const analysisPackageManifestSchema = z.object({
  generator: z.literal('DesignDNA'),
  manifestVersion: z.literal('1.0.0'),
  milestone: z.literal('M11'),
  generatedAt: z.string().min(1),
  privacy: z.object({
    localOnlyGeneration: z.literal(true),
    includesOriginalScreenshot: z.boolean(),
    containsSecrets: z.literal(false)
  }),
  source: z.object({
    fileName: z.string().min(1),
    format: z.string().min(1),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    aiModel: z.string().nullable()
  }),
  completeness: z.object({
    hasMeasuredColors: z.boolean(),
    hasVisualAi: z.boolean(),
    hasDesignTokens: z.boolean(),
    populatedBoardSections: z.number().int().min(0).max(7),
    totalBoardSections: z.literal(7),
    tokenCount: z.number().int().nonnegative(),
    regionCount: z.number().int().nonnegative(),
    visualElementCount: z.number().int().nonnegative(),
    patternCount: z.number().int().nonnegative(),
    croppedAssetCount: z.number().int().nonnegative()
  }),
  files: z.array(
    z.object({
      path: z.string().min(1),
      format: z.string().min(1),
      category: z.enum(['developer', 'documentation', 'assets', 'package', 'manifest']),
      description: z.string().min(1),
      bytes: z.number().int().nonnegative()
    })
  )
});
