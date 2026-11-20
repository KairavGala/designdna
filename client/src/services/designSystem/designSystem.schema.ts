import { z } from 'zod';

export const tokenCategorySchema = z.enum([
  'color',
  'typography',
  'spacing',
  'radius',
  'border',
  'shadow',
  'layout'
]);

export const tokenProvenanceSchema = z.enum(['measured', 'ai-inferred', 'derived']);

export const confidenceLevelSchema = z.enum(['high', 'medium', 'low']);

export const reconciliationStatusSchema = z.enum([
  'aligned',
  'anchored-to-measured',
  'conflict-preserved',
  'ai-only'
]);

export const tokenCssTypeSchema = z.enum([
  'color',
  'fontFamily',
  'dimension',
  'fontWeight',
  'number',
  'border',
  'shadow',
  'other'
]);

export const tokenEvidenceSchema = z.object({
  source: z.string().min(1),
  measuredHex: z
    .string()
    .regex(/^#[0-9A-F]{6}$/)
    .optional(),
  pixelPercentage: z.number().min(0).max(100).optional(),
  measuredRank: z.number().int().positive().optional(),
  aiRole: z.string().min(1).optional(),
  aiEstimate: z.string().min(1).optional(),
  deltaE: z.number().min(0).optional(),
  contrastRatio: z.number().positive().optional(),
  notes: z.array(z.string().min(1))
});

export const tokenReconciliationSchema = z.object({
  status: reconciliationStatusSchema,
  measuredValue: z.string().min(1).optional(),
  aiSuggestedValue: z.string().min(1).optional(),
  resolution: z.string().min(1)
});

export const designTokenSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:\.[a-z0-9-]+)+$/, 'Invalid canonical token ID'),
  name: z.string().regex(/^[a-z][a-z0-9-]*$/, 'Invalid token name'),
  cssVariable: z
    .string()
    .regex(/^--[a-z][a-z0-9-]*$/, 'Invalid CSS custom property name'),
  category: tokenCategorySchema,
  cssType: tokenCssTypeSchema,
  value: z.string().min(1),
  rawValue: z.string().min(1).optional(),
  provenance: tokenProvenanceSchema,
  confidence: confidenceLevelSchema,
  description: z.string().min(1),
  evidence: tokenEvidenceSchema,
  reconciliation: tokenReconciliationSchema.optional()
});

export const designSystemReconciliationNoteSchema = z.object({
  id: z.string().min(1),
  category: tokenCategorySchema,
  tokenName: z.string().min(1),
  kind: z.enum(['anchored-to-measured', 'conflict-preserved', 'deduplicated']),
  measuredValue: z.string().min(1).optional(),
  aiSuggestedValue: z.string().min(1).optional(),
  finalValue: z.string().min(1),
  explanation: z.string().min(1)
});

export const designTokenJsonLeafSchema = z.object({
  $value: z.string().min(1),
  $type: tokenCssTypeSchema,
  $description: z.string().min(1),
  $extensions: z.object({
    designdna: z.object({
      id: z.string().min(1),
      cssVariable: z.string().regex(/^--[a-z][a-z0-9-]*$/),
      provenance: tokenProvenanceSchema,
      confidence: confidenceLevelSchema,
      evidence: tokenEvidenceSchema,
      reconciliation: tokenReconciliationSchema.optional()
    })
  })
});

export const designTokensJsonDocumentSchema = z.object({
  $schema: z.string().min(1),
  $metadata: z.object({
    generator: z.literal('DesignDNA'),
    schemaVersion: z.literal('1.0.0'),
    sourceFile: z.string().min(1),
    dimensions: z.object({
      width: z.number().int().positive(),
      height: z.number().int().positive()
    }),
    aiModel: z.string().min(1).nullable(),
    tokenCount: z.number().int().nonnegative()
  }),
  tokens: z.object({
    color: z.record(z.string(), designTokenJsonLeafSchema),
    typography: z.record(z.string(), designTokenJsonLeafSchema),
    spacing: z.record(z.string(), designTokenJsonLeafSchema),
    radius: z.record(z.string(), designTokenJsonLeafSchema),
    border: z.record(z.string(), designTokenJsonLeafSchema),
    shadow: z.record(z.string(), designTokenJsonLeafSchema),
    layout: z.record(z.string(), designTokenJsonLeafSchema)
  })
});

export const designSystemSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  source: z.object({
    fileName: z.string().min(1),
    format: z.string().min(1),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    colorExtractionMethod: z.string().min(1),
    aiModel: z.string().min(1).nullable(),
    hasAiInterpretation: z.boolean()
  }),
  summary: z.object({
    styleSummary: z.string().min(1),
    designTone: z.string().min(1),
    interfaceType: z.string().min(1),
    themeMode: z.enum(['light', 'dark', 'mixed']),
    overallConfidence: confidenceLevelSchema
  }),
  tokens: z.array(designTokenSchema),
  byCategory: z.object({
    color: z.array(designTokenSchema),
    typography: z.array(designTokenSchema),
    spacing: z.array(designTokenSchema),
    radius: z.array(designTokenSchema),
    border: z.array(designTokenSchema),
    shadow: z.array(designTokenSchema),
    layout: z.array(designTokenSchema)
  }),
  reconciliationNotes: z.array(designSystemReconciliationNoteSchema),
  metrics: z.object({
    totalTokens: z.number().int().nonnegative(),
    measuredCount: z.number().int().nonnegative(),
    aiInferredCount: z.number().int().nonnegative(),
    derivedCount: z.number().int().nonnegative(),
    deduplicatedCount: z.number().int().nonnegative(),
    conflictCount: z.number().int().nonnegative()
  }),
  cssVariables: z.string().min(1),
  jsonBundle: designTokensJsonDocumentSchema
});
