import { z } from 'zod';

export const confidenceLevelSchema = z.enum(['high', 'medium', 'low']);

export const measuredColorInputSchema = z.object({
  hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid HEX colour'),
  percentage: z.number().min(0).max(100),
  rank: z.number().int().positive()
});

export const visualAnalysisRequestSchema = z.object({
  imageBase64: z
    .string()
    .min(64, 'Image payload is too small')
    .max(9_000_000, 'Encoded image payload exceeds maximum allowed size'),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
  fileName: z.string().min(1).max(255),
  dimensions: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive()
  }),
  measuredPalette: z.array(measuredColorInputSchema).min(1).max(16)
});

export const semanticColorRoleSchema = z.enum([
  'background',
  'surface',
  'primary_text',
  'secondary_text',
  'primary_brand',
  'accent',
  'border',
  'semantic_status'
]);

export const semanticColorAssignmentSchema = z.object({
  role: semanticColorRoleSchema,
  label: z.string().min(1),
  hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  matchedMeasuredHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullable(),
  rationale: z.string().min(1),
  confidence: confidenceLevelSchema
});

export const typographyHierarchyItemSchema = z.object({
  level: z.string().min(1),
  estimatedSize: z.string().min(1),
  estimatedWeight: z.string().min(1),
  lineHeight: z.string().min(1),
  usage: z.string().min(1),
  confidence: confidenceLevelSchema
});

export const spacingScaleStepSchema = z.object({
  token: z.string().min(1),
  value: z.string().min(1),
  usage: z.string().min(1)
});

export const detectedComponentSchema = z.object({
  name: z.string().min(1),
  category: z.enum([
    'navigation',
    'button',
    'card',
    'input',
    'badge',
    'table',
    'modal',
    'other'
  ]),
  visualTreatment: z.string().min(1),
  borderRadius: z.string().min(1),
  emphasis: z.string().min(1),
  confidence: confidenceLevelSchema
});

export const layoutRegionSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  proportion: z.string().min(1)
});

export const borderRadiusItemSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  usage: z.string().min(1)
});

export const visualRegionCategorySchema = z.enum([
  'header-navigation',
  'hero',
  'main-content',
  'text-block',
  'media',
  'card-container',
  'cta-button',
  'footer',
  'decorative'
]);

export const normalizedBoundingBoxSchema = z
  .object({
    x: z.number().finite().min(0).max(1),
    y: z.number().finite().min(0).max(1),
    width: z.number().finite().gt(0).max(1),
    height: z.number().finite().gt(0).max(1)
  })
  .refine((box) => box.width >= 0.015 && box.height >= 0.015, {
    message: 'Bounding box is too small to represent a meaningful visual region'
  })
  .refine((box) => box.x + box.width <= 1.01 && box.y + box.height <= 1.01, {
    message: 'Bounding box extends outside normalized [0, 1] screenshot bounds'
  });

export const regionObservationsSchema = z.object({
  typography: z.string().nullable(),
  layoutAlignment: z.string().min(1),
  shapesAndComponents: z.string().min(1),
  spacingAndComposition: z.string().min(1),
  decorativeElements: z.string().nullable(),
  designInterpretation: z.string().min(1)
});

export const rawVisualRegionSchema = z.object({
  name: z.string().min(1).max(160),
  category: visualRegionCategorySchema,
  boundingBox: normalizedBoundingBoxSchema,
  boundaryPrecision: z.enum(['precise', 'approximate']).default('approximate'),
  description: z.string().min(1).max(600),
  observations: regionObservationsSchema,
  confidence: confidenceLevelSchema,
  evidence: z.array(z.string().min(1)).min(1).max(8)
});

export const visualRegionSchema = rawVisualRegionSchema.extend({
  id: z.string().min(1)
});

export const visualElementCategorySchema = z.enum([
  'geometric-motif',
  'background-texture',
  'icon-symbol',
  'component-style',
  'decorative-detail'
]);

export const visualElementCharacteristicsSchema = z.object({
  geometry: z.string().min(1).max(240),
  surfaceAndColor: z.string().min(1).max(240),
  styleTraits: z.array(z.string().min(1).max(80)).min(1).max(6),
  visualRole: z.string().min(1).max(280)
});

export const rawVisualElementSchema = z.object({
  name: z.string().min(1).max(160),
  category: visualElementCategorySchema,
  subcategory: z.string().min(1).max(100),
  description: z.string().min(1).max(600),
  boundingBox: normalizedBoundingBoxSchema,
  additionalLocations: z.array(normalizedBoundingBoxSchema).max(6).default([]),
  boundaryPrecision: z.enum(['precise', 'approximate']).default('approximate'),
  repetitionStatus: z.enum(['recurring', 'individual']).default('individual'),
  surfaceBasis: z
    .enum(['directly-visible-surface', 'inferred-visual-effect'])
    .default('inferred-visual-effect'),
  characteristics: visualElementCharacteristicsSchema,
  confidence: confidenceLevelSchema,
  evidence: z.array(z.string().min(1)).min(1).max(6)
});

export const visualElementSchema = rawVisualElementSchema.extend({
  id: z.string().min(1),
  parentRegionId: z.string().min(1).nullable(),
  parentRegionName: z.string().min(1).nullable(),
  relatedRegionIds: z.array(z.string().min(1)).default([]),
  occurrenceCount: z.number().int().min(1)
});

export const patternRelationshipTypeSchema = z.enum([
  'repeated-motif',
  'shared-component-language',
  'recurring-background',
  'structural-rhythm'
]);

export const rawPatternRelationshipSchema = z.object({
  name: z.string().min(1).max(160),
  patternType: patternRelationshipTypeSchema,
  description: z.string().min(1).max(600),
  elementNames: z.array(z.string().min(1)).min(1).max(8),
  occurrenceCount: z.number().int().min(2).max(20),
  confidence: confidenceLevelSchema,
  evidence: z.array(z.string().min(1)).min(1).max(6)
});

export const patternRelationshipSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(160),
  patternType: patternRelationshipTypeSchema,
  description: z.string().min(1).max(600),
  elementIds: z.array(z.string().min(1)).min(1),
  regionIds: z.array(z.string().min(1)).default([]),
  occurrenceCount: z.number().int().min(2),
  confidence: confidenceLevelSchema,
  evidence: z.array(z.string().min(1)).min(1).max(6)
});

export const visualInterpretationSchema = z.object({
  summary: z.object({
    styleSummary: z.string().min(1),
    designTone: z.string().min(1),
    interfaceType: z.string().min(1),
    themeMode: z.enum(['light', 'dark', 'mixed']),
    overallConfidence: confidenceLevelSchema
  }),
  semanticColors: z.array(semanticColorAssignmentSchema).min(1).max(10),
  typography: z.object({
    headingFontStyle: z.string().min(1),
    bodyFontStyle: z.string().min(1),
    monospaceDetected: z.boolean(),
    scaleSummary: z.string().min(1),
    hierarchy: z.array(typographyHierarchyItemSchema).min(1).max(8),
    confidence: confidenceLevelSchema
  }),
  spacing: z.object({
    baseUnit: z.string().min(1),
    density: z.enum(['compact', 'comfortable', 'spacious']),
    sectionRhythm: z.string().min(1),
    containerPadding: z.string().min(1),
    scaleSteps: z.array(spacingScaleStepSchema).min(1).max(8),
    confidence: confidenceLevelSchema
  }),
  components: z.array(detectedComponentSchema).min(1).max(10),
  layout: z.object({
    structureType: z.string().min(1),
    gridColumns: z.string().min(1),
    alignment: z.string().min(1),
    contentWidth: z.string().min(1),
    regions: z.array(layoutRegionSchema).min(1).max(8),
    confidence: confidenceLevelSchema
  }),
  effects: z.object({
    elevationStyle: z.enum(['flat', 'subtle-border', 'layered-shadow', 'glass']),
    borderStyle: z.string().min(1),
    shadowStyle: z.string().min(1),
    borderRadiusScale: z.array(borderRadiusItemSchema).min(1).max(6),
    notes: z.string().min(1),
    confidence: confidenceLevelSchema
  }),
  visualRegions: z.array(visualRegionSchema).max(14).default([]),
  visualElements: z.array(visualElementSchema).max(18).default([]),
  patternRelationships: z.array(patternRelationshipSchema).max(10).default([])
});

export type VisualAnalysisRequest = z.infer<typeof visualAnalysisRequestSchema>;
export type VisualRegionCategory = z.infer<typeof visualRegionCategorySchema>;
export type NormalizedBoundingBox = z.infer<typeof normalizedBoundingBoxSchema>;
export type VisualRegion = z.infer<typeof visualRegionSchema>;
export type VisualElementCategory = z.infer<typeof visualElementCategorySchema>;
export type VisualElement = z.infer<typeof visualElementSchema>;
export type PatternRelationshipType = z.infer<typeof patternRelationshipTypeSchema>;
export type PatternRelationship = z.infer<typeof patternRelationshipSchema>;
export type VisualInterpretation = z.infer<typeof visualInterpretationSchema>;
