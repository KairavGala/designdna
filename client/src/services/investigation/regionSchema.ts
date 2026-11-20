import { z } from 'zod';
import type {
  NormalizedBoundingBox,
  PixelBoundingBox,
  RegionValidationSummary,
  VisualRegion
} from '../../types/investigation';

export const confidenceLevelSchema = z.enum(['high', 'medium', 'low']);

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

/**
 * Strict normalized bounding-box validator.
 * Rejects non-finite numbers, negative values, values > 1, degenerate sizes (< 1.5%),
 * and boxes extending outside the [0, 1] screenshot viewport.
 */
export const normalizedBoundingBoxSchema = z
  .object({
    x: z.number().finite().min(0).max(1),
    y: z.number().finite().min(0).max(1),
    width: z.number().finite().gt(0).max(1),
    height: z.number().finite().gt(0).max(1)
  })
  .refine((box) => box.width >= 0.015 && box.height >= 0.015, {
    message: 'Bounding box is smaller than the minimum meaningful region size (1.5%)'
  })
  .refine((box) => box.x + box.width <= 1.01 && box.y + box.height <= 1.01, {
    message: 'Bounding box exceeds normalized [0, 1] screenshot bounds'
  });

export const regionObservationsSchema = z.object({
  typography: z.string().nullable(),
  layoutAlignment: z.string().min(1),
  shapesAndComponents: z.string().min(1),
  spacingAndComposition: z.string().min(1),
  decorativeElements: z.string().nullable(),
  designInterpretation: z.string().min(1)
});

export const visualRegionInputSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1).max(160),
  category: visualRegionCategorySchema,
  boundingBox: normalizedBoundingBoxSchema,
  boundaryPrecision: z.enum(['precise', 'approximate']).default('approximate'),
  description: z.string().min(1).max(600),
  observations: regionObservationsSchema,
  confidence: confidenceLevelSchema,
  evidence: z.array(z.string().min(1)).min(1).max(8)
});

export const visualRegionSchema = visualRegionInputSchema.extend({
  id: z.string().min(1)
});

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return slug || 'region';
}

function roundCoord(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/**
 * Generates a deterministic, stable region identifier from category, name,
 * and normalized coordinates so identical analysis outputs always yield identical IDs.
 */
export function buildStableRegionId(
  category: string,
  name: string,
  box: NormalizedBoundingBox
): string {
  return `reg-${category}-${slugify(name)}-${Math.round(box.x * 100)}-${Math.round(box.y * 100)}`;
}

/**
 * Converts a normalized [0, 1] bounding box into integer pixel coordinates
 * for an image of the specified dimensions.
 */
export function normalizedBoxToPixels(
  box: NormalizedBoundingBox,
  imageWidth: number,
  imageHeight: number
): PixelBoundingBox {
  const x = Math.max(0, Math.min(imageWidth - 1, Math.round(box.x * imageWidth)));
  const y = Math.max(0, Math.min(imageHeight - 1, Math.round(box.y * imageHeight)));
  const width = Math.max(1, Math.min(imageWidth - x, Math.round(box.width * imageWidth)));
  const height = Math.max(1, Math.min(imageHeight - y, Math.round(box.height * imageHeight)));
  return { x, y, width, height };
}

/**
 * Pure, deterministic validator and normalizer for visual region annotations.
 * Rejects malformed entries and invalid coordinates without mutating valid M5 outputs.
 */
export function validateAndNormalizeRegions(rawRegions: unknown): RegionValidationSummary {
  if (!Array.isArray(rawRegions)) {
    return { regions: [], rejectedCount: 0 };
  }

  const regions: VisualRegion[] = [];
  const usedIds = new Set<string>();
  let rejectedCount = 0;

  for (const item of rawRegions) {
    const parsed = visualRegionInputSchema.safeParse(item);
    if (!parsed.success) {
      rejectedCount += 1;
      continue;
    }

    const valid = parsed.data;
    const x = roundCoord(valid.boundingBox.x);
    const y = roundCoord(valid.boundingBox.y);
    const width = roundCoord(Math.min(valid.boundingBox.width, 1 - x));
    const height = roundCoord(Math.min(valid.boundingBox.height, 1 - y));

    if (width < 0.015 || height < 0.015) {
      rejectedCount += 1;
      continue;
    }

    const normalizedBox: NormalizedBoundingBox = { x, y, width, height };
    const preferredId =
      valid.id && valid.id.trim().length > 0
        ? valid.id.trim()
        : buildStableRegionId(valid.category, valid.name, normalizedBox);

    let stableId = preferredId;
    let suffix = 2;
    while (usedIds.has(stableId)) {
      stableId = `${preferredId}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(stableId);

    regions.push({
      id: stableId,
      name: valid.name.trim(),
      category: valid.category,
      boundingBox: normalizedBox,
      boundaryPrecision: valid.boundaryPrecision,
      description: valid.description.trim(),
      observations: {
        typography: valid.observations.typography?.trim() || null,
        layoutAlignment: valid.observations.layoutAlignment.trim(),
        shapesAndComponents: valid.observations.shapesAndComponents.trim(),
        spacingAndComposition: valid.observations.spacingAndComposition.trim(),
        decorativeElements: valid.observations.decorativeElements?.trim() || null,
        designInterpretation: valid.observations.designInterpretation.trim()
      },
      confidence: valid.confidence,
      evidence: valid.evidence.map((e) => e.trim()).filter(Boolean)
    });
  }

  // Deterministic reading-order sort (top-to-bottom, left-to-right)
  regions.sort((a, b) => {
    const dy = a.boundingBox.y - b.boundingBox.y;
    if (Math.abs(dy) > 0.02) return dy;
    return a.boundingBox.x - b.boundingBox.x;
  });

  return { regions, rejectedCount };
}
