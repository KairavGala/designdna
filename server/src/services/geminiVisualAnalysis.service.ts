import { ThinkingLevel, Type, type GenerateContentResponse, type Schema } from '@google/genai';
import { env } from '../config/env.js';
import {
  normalizedBoundingBoxSchema,
  rawPatternRelationshipSchema,
  rawVisualElementSchema,
  rawVisualRegionSchema,
  visualInterpretationSchema,
  type NormalizedBoundingBox,
  type PatternRelationship,
  type VisualAnalysisRequest,
  type VisualElement,
  type VisualInterpretation,
  type VisualRegion
} from '../schemas/visualAnalysis.schema.js';
import { GeminiServiceError, getGeminiClient } from './geminiClient.js';

export interface VisualAnalysisContext {
  requestId?: string;
  signal?: AbortSignal;
}

export interface VisualAnalysisResult {
  interpretation: VisualInterpretation;
  meta: {
    model: string;
    durationMs: number;
    analyzedAt: string;
  };
}

function logServiceStage(
  event: string,
  fields: Record<string, string | number | boolean | undefined>
): void {
  const parts = Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`);
  console.info(`[VisualAnalysis] stage=${event} ${parts.join(' ')}`);
}

const CONFIDENCE_SCHEMA: Schema = {
  type: Type.STRING,
  enum: ['high', 'medium', 'low']
};

const BOUNDING_BOX_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  description:
    'Normalized screenshot-relative coordinates as decimals in [0.0, 1.0] where x + width <= 1.0 and y + height <= 1.0.',
  required: ['x', 'y', 'width', 'height'],
  properties: {
    x: {
      type: Type.NUMBER,
      description: 'Left edge fraction in [0.0, 1.0]'
    },
    y: {
      type: Type.NUMBER,
      description: 'Top edge fraction in [0.0, 1.0]'
    },
    width: {
      type: Type.NUMBER,
      description: 'Width fraction in [0.02, 1.0], x + width <= 1.0'
    },
    height: {
      type: Type.NUMBER,
      description: 'Height fraction in [0.02, 1.0], y + height <= 1.0'
    }
  }
};

// Keep the serving JSON schema free of maxItems and numeric min/max range constraints so
// gemini-3.1-flash-lite compiles a compact structured-output grammar; server-side Zod and
// normalizers enforce all array bounds, coordinate invariants, and deduplication strictly.
export const VISUAL_INTERPRETATION_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  required: [
    'summary',
    'semanticColors',
    'typography',
    'spacing',
    'components',
    'layout',
    'effects',
    'visualRegions',
    'visualElements',
    'patternRelationships'
  ],
  properties: {
    summary: {
      type: Type.OBJECT,
      required: ['styleSummary', 'designTone', 'interfaceType', 'themeMode', 'overallConfidence'],
      properties: {
        styleSummary: { type: Type.STRING },
        designTone: { type: Type.STRING },
        interfaceType: { type: Type.STRING },
        themeMode: { type: Type.STRING, enum: ['light', 'dark', 'mixed'] },
        overallConfidence: CONFIDENCE_SCHEMA
      }
    },
    semanticColors: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ['role', 'label', 'hex', 'matchedMeasuredHex', 'rationale', 'confidence'],
        properties: {
          role: {
            type: Type.STRING,
            enum: [
              'background',
              'surface',
              'primary_text',
              'secondary_text',
              'primary_brand',
              'accent',
              'border',
              'semantic_status'
            ]
          },
          label: { type: Type.STRING },
          hex: { type: Type.STRING },
          matchedMeasuredHex: { type: Type.STRING, nullable: true },
          rationale: { type: Type.STRING },
          confidence: CONFIDENCE_SCHEMA
        }
      }
    },
    typography: {
      type: Type.OBJECT,
      required: [
        'headingFontStyle',
        'bodyFontStyle',
        'monospaceDetected',
        'scaleSummary',
        'hierarchy',
        'confidence'
      ],
      properties: {
        headingFontStyle: { type: Type.STRING },
        bodyFontStyle: { type: Type.STRING },
        monospaceDetected: { type: Type.BOOLEAN },
        scaleSummary: { type: Type.STRING },
        hierarchy: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            required: ['level', 'estimatedSize', 'estimatedWeight', 'lineHeight', 'usage', 'confidence'],
            properties: {
              level: { type: Type.STRING },
              estimatedSize: { type: Type.STRING },
              estimatedWeight: { type: Type.STRING },
              lineHeight: { type: Type.STRING },
              usage: { type: Type.STRING },
              confidence: CONFIDENCE_SCHEMA
            }
          }
        },
        confidence: CONFIDENCE_SCHEMA
      }
    },
    spacing: {
      type: Type.OBJECT,
      required: ['baseUnit', 'density', 'sectionRhythm', 'containerPadding', 'scaleSteps', 'confidence'],
      properties: {
        baseUnit: { type: Type.STRING },
        density: { type: Type.STRING, enum: ['compact', 'comfortable', 'spacious'] },
        sectionRhythm: { type: Type.STRING },
        containerPadding: { type: Type.STRING },
        scaleSteps: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            required: ['token', 'value', 'usage'],
            properties: {
              token: { type: Type.STRING },
              value: { type: Type.STRING },
              usage: { type: Type.STRING }
            }
          }
        },
        confidence: CONFIDENCE_SCHEMA
      }
    },
    components: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ['name', 'category', 'visualTreatment', 'borderRadius', 'emphasis', 'confidence'],
        properties: {
          name: { type: Type.STRING },
          category: {
            type: Type.STRING,
            enum: ['navigation', 'button', 'card', 'input', 'badge', 'table', 'modal', 'other']
          },
          visualTreatment: { type: Type.STRING },
          borderRadius: { type: Type.STRING },
          emphasis: { type: Type.STRING },
          confidence: CONFIDENCE_SCHEMA
        }
      }
    },
    layout: {
      type: Type.OBJECT,
      required: ['structureType', 'gridColumns', 'alignment', 'contentWidth', 'regions', 'confidence'],
      properties: {
        structureType: { type: Type.STRING },
        gridColumns: { type: Type.STRING },
        alignment: { type: Type.STRING },
        contentWidth: { type: Type.STRING },
        regions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            required: ['name', 'role', 'proportion'],
            properties: {
              name: { type: Type.STRING },
              role: { type: Type.STRING },
              proportion: { type: Type.STRING }
            }
          }
        },
        confidence: CONFIDENCE_SCHEMA
      }
    },
    effects: {
      type: Type.OBJECT,
      required: ['elevationStyle', 'borderStyle', 'shadowStyle', 'borderRadiusScale', 'notes', 'confidence'],
      properties: {
        elevationStyle: {
          type: Type.STRING,
          enum: ['flat', 'subtle-border', 'layered-shadow', 'glass']
        },
        borderStyle: { type: Type.STRING },
        shadowStyle: { type: Type.STRING },
        borderRadiusScale: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            required: ['label', 'value', 'usage'],
            properties: {
              label: { type: Type.STRING },
              value: { type: Type.STRING },
              usage: { type: Type.STRING }
            }
          }
        },
        notes: { type: Type.STRING },
        confidence: CONFIDENCE_SCHEMA
      }
    },
    visualRegions: {
      type: Type.ARRAY,
      description:
        '4 to 8 major visually distinct UI regions with normalized [0.0, 1.0] bounding boxes.',
      items: {
        type: Type.OBJECT,
        required: [
          'name',
          'category',
          'boundingBox',
          'boundaryPrecision',
          'description',
          'observations',
          'confidence',
          'evidence'
        ],
        properties: {
          name: { type: Type.STRING },
          category: {
            type: Type.STRING,
            enum: [
              'header-navigation',
              'hero',
              'main-content',
              'text-block',
              'media',
              'card-container',
              'cta-button',
              'footer',
              'decorative'
            ]
          },
          boundingBox: BOUNDING_BOX_RESPONSE_SCHEMA,
          boundaryPrecision: {
            type: Type.STRING,
            enum: ['precise', 'approximate']
          },
          description: { type: Type.STRING },
          observations: {
            type: Type.OBJECT,
            required: [
              'typography',
              'layoutAlignment',
              'shapesAndComponents',
              'spacingAndComposition',
              'decorativeElements',
              'designInterpretation'
            ],
            properties: {
              typography: { type: Type.STRING, nullable: true },
              layoutAlignment: { type: Type.STRING },
              shapesAndComponents: { type: Type.STRING },
              spacingAndComposition: { type: Type.STRING },
              decorativeElements: { type: Type.STRING, nullable: true },
              designInterpretation: { type: Type.STRING }
            }
          },
          confidence: CONFIDENCE_SCHEMA,
          evidence: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      }
    },
    visualElements: {
      type: Type.ARRAY,
      description:
        '4 to 10 distinctive visible visual elements (geometric motifs, backgrounds/textures, icons/symbols, component styles, decorative details) with normalized [0.0, 1.0] locations.',
      items: {
        type: Type.OBJECT,
        required: [
          'name',
          'category',
          'subcategory',
          'description',
          'boundingBox',
          'additionalLocations',
          'boundaryPrecision',
          'repetitionStatus',
          'surfaceBasis',
          'characteristics',
          'confidence',
          'evidence'
        ],
        properties: {
          name: { type: Type.STRING },
          category: {
            type: Type.STRING,
            enum: [
              'geometric-motif',
              'background-texture',
              'icon-symbol',
              'component-style',
              'decorative-detail'
            ]
          },
          subcategory: {
            type: Type.STRING,
            description:
              'Specific element type such as Button, Card, Grid texture, Solid surface, Outline icon, Accent line, Geometric shape.'
          },
          description: { type: Type.STRING },
          boundingBox: BOUNDING_BOX_RESPONSE_SCHEMA,
          additionalLocations: {
            type: Type.ARRAY,
            description:
              'Other genuinely visible occurrences of this exact visual element elsewhere on the screenshot. Leave empty [] if only one instance is visible.',
            items: BOUNDING_BOX_RESPONSE_SCHEMA
          },
          boundaryPrecision: {
            type: Type.STRING,
            enum: ['precise', 'approximate']
          },
          repetitionStatus: {
            type: Type.STRING,
            enum: ['recurring', 'individual'],
            description:
              'Set to recurring ONLY when 2 or more separate occurrences are visibly present with valid bounding boxes; otherwise set to individual.'
          },
          surfaceBasis: {
            type: Type.STRING,
            enum: ['directly-visible-surface', 'inferred-visual-effect'],
            description:
              'Distinguish directly visible surfaces/textures (e.g. solid fill, crisp border, visible grid) from inferred visual styling.'
          },
          characteristics: {
            type: Type.OBJECT,
            required: ['geometry', 'surfaceAndColor', 'styleTraits', 'visualRole'],
            properties: {
              geometry: { type: Type.STRING },
              surfaceAndColor: { type: Type.STRING },
              styleTraits: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              visualRole: { type: Type.STRING }
            }
          },
          confidence: CONFIDENCE_SCHEMA,
          evidence: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      }
    },
    patternRelationships: {
      type: Type.ARRAY,
      description:
        '0 to 5 shared recurring visual patterns that genuinely repeat across 2 or more separate screenshot locations. Omit single-instance elements.',
      items: {
        type: Type.OBJECT,
        required: [
          'name',
          'patternType',
          'description',
          'elementNames',
          'occurrenceCount',
          'confidence',
          'evidence'
        ],
        properties: {
          name: { type: Type.STRING },
          patternType: {
            type: Type.STRING,
            enum: [
              'repeated-motif',
              'shared-component-language',
              'recurring-background',
              'structural-rhythm'
            ]
          },
          description: { type: Type.STRING },
          elementNames: {
            type: Type.ARRAY,
            description: 'Exact names from visualElements that participate in this shared pattern.',
            items: { type: Type.STRING }
          },
          occurrenceCount: {
            type: Type.INTEGER,
            description: 'Integer count >= 2 of distinct visible occurrences.'
          },
          confidence: CONFIDENCE_SCHEMA,
          evidence: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      }
    }
  }
};

const SYSTEM_INSTRUCTION = [
  'You are a senior design systems architect analysing a website or application screenshot.',
  'Return concise, grounded, developer-friendly visual design system interpretations strictly in the requested JSON schema.',
  'Important grounding rules:',
  '1. You are given a measured pixel colour palette extracted deterministically from the image. Always prefer anchoring semanticColors.hex and semanticColors.matchedMeasuredHex to those exact measured HEX values when they match a visual role (e.g., background, surface, primary_text, primary_brand, accent, border). If a visible semantic role (such as a small text or border colour) was too small to appear in the measured palette, provide your best visual #RRGGBB estimate for hex and set matchedMeasuredHex to null.',
  '2. Never fabricate proprietary font names with false certainty — describe the typographic classification and close reference families honestly (e.g., "Geometric sans-serif (similar to Plus Jakarta Sans / Inter)").',
  '3. Keep descriptions concise, technical, and directly observable from the screenshot. Do not invent components, sections, textures, or shadows that are not visibly present. Never claim to have inspected hidden HTML, CSS, or DOM source code.',
  '4. Calibrate confidence honestly (high, medium, low) based on visual clarity in the screenshot.',
  '5. All hex values must be valid 6-digit uppercase hex codes like #FFFFFF.',
  '6. Keep arrays focused and high-signal: return 4–8 semanticColors, 3–6 typography.hierarchy entries, 3–6 spacing.scaleSteps, 3–8 components, 3–6 layout.regions, and 3–5 effects.borderRadiusScale entries.',
  '7. For visualRegions, identify 4 to 8 major visually distinct structural regions of the screenshot (header/navigation, hero, main content, cards/containers, buttons/CTAs, text blocks, media/charts, footer, decorative).',
  '8. Every boundingBox (in visualRegions and visualElements) MUST use normalised decimal coordinates between 0.0 and 1.0 relative to the full screenshot (x = left / totalWidth, y = top / totalHeight, width = boxWidth / totalWidth, height = boxHeight / totalHeight), with x >= 0, y >= 0, width >= 0.02, height >= 0.02, x + width <= 1.0, and y + height <= 1.0. NEVER use pixel coordinates or 0-1000 integers.',
  '9. Set boundaryPrecision to "precise" only when edges are visually crisp (bordered cards, navbars, solid buttons), and "approximate" when edges blend into background whitespace.',
  '10. For visualElements, identify 4 to 10 genuinely visible distinctive visual elements across geometric-motif, background-texture, icon-symbol, component-style, and decorative-detail. Never claim an icon library or asset source unless directly verifiable from the pixels. Only include additionalLocations (up to 4) when the same visual element genuinely repeats in separate visible places; otherwise leave additionalLocations empty [] and set repetitionStatus to "individual". Include 2–4 concise styleTraits per element.',
  '11. For patternRelationships, return 0 to 5 shared patterns that genuinely repeat across 2 or more separate visible occurrences on the screenshot (occurrenceCount >= 2). NEVER claim repetition from a single occurrence. Reference exact element names from visualElements in elementNames (up to 6).',
  '12. Keep every description, rationale, and observation field concise and crisp (1 short sentence, ~8–20 words) and provide 1–3 brief evidence items per region, element, or pattern so the JSON response remains focused and fast to generate without omitting required findings.'
].join('\n');

function buildPromptText(request: VisualAnalysisRequest): string {
  const paletteLines = request.measuredPalette
    .map((c) => `- Rank #${c.rank}: ${c.hex} (${c.percentage.toFixed(1)}% of sampled area)`)
    .join('\n');

  return [
    `Analyse this interface screenshot (${request.dimensions.width} × ${request.dimensions.height} px).`,
    '',
    'Measured pixel colour palette (deterministic Canvas extraction):',
    paletteLines,
    '',
    'Infer the structured design system properties across semantic colour roles, typography hierarchy, spacing rhythm, visible UI components, layout structure, visual effects, structural visualRegions, distinctive visualElements (motifs, textures, icons, component styles, decorative details), and verified multi-occurrence patternRelationships using normalised [0.0..1.0] bounding boxes.'
  ].join('\n');
}

interface RawGoogleApiErrorDetail {
  '@type'?: string;
  retryDelay?: string;
  violations?: Array<{
    quotaMetric?: string;
    quotaId?: string;
    quotaDimensions?: Record<string, string>;
    quotaValue?: string;
    subject?: string;
    description?: string;
  }>;
  reason?: string;
  domain?: string;
}

interface ParsedGoogleApiError {
  httpStatus?: number;
  geminiStatus?: string;
  message: string;
  quotaMetric?: string;
  quotaId?: string;
  quotaValue?: string;
  retryDelay?: string;
  reason?: string;
}

function sanitizeSecretStrings(input: string): string {
  return input
    .replace(/AIza[0-9A-Za-z\-_]{20,}/g, '[REDACTED_KEY]')
    .replace(/AQ\.[0-9A-Za-z\-_]{20,}/g, '[REDACTED_KEY]')
    .replace(/([?&]key=)[^&\s"']+/gi, '$1[REDACTED_KEY]');
}

function parseGoogleApiError(err: unknown): ParsedGoogleApiError {
  const rawMessage = err instanceof Error ? err.message : String(err);
  const topStatus =
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof (err as { status?: unknown }).status === 'number'
      ? (err as { status: number }).status
      : undefined;

  let httpStatus = topStatus;
  let geminiStatus: string | undefined;
  let extractedMessage = rawMessage;
  let quotaMetric: string | undefined;
  let quotaId: string | undefined;
  let quotaValue: string | undefined;
  let retryDelay: string | undefined;
  let reason: string | undefined;

  // @google/genai ApiError often places the serialized JSON response in err.message
  const jsonStart = rawMessage.indexOf('{');
  if (jsonStart !== -1) {
    try {
      const parsed = JSON.parse(rawMessage.slice(jsonStart)) as {
        error?: {
          code?: number;
          message?: string;
          status?: string;
          details?: RawGoogleApiErrorDetail[];
        };
      };

      const apiErr = parsed?.error;
      if (apiErr) {
        if (typeof apiErr.code === 'number') httpStatus = apiErr.code;
        if (typeof apiErr.status === 'string') geminiStatus = apiErr.status;
        if (typeof apiErr.message === 'string' && apiErr.message.trim()) {
          extractedMessage = apiErr.message.trim();
        }

        if (Array.isArray(apiErr.details)) {
          for (const detail of apiErr.details) {
            if (typeof detail.retryDelay === 'string' && detail.retryDelay) {
              retryDelay = detail.retryDelay;
            }
            if (typeof detail.reason === 'string' && detail.reason) {
              reason = detail.reason;
            }
            if (Array.isArray(detail.violations) && detail.violations.length > 0) {
              const first = detail.violations[0];
              if (first.quotaMetric) quotaMetric = first.quotaMetric;
              if (first.quotaId) quotaId = first.quotaId;
              if (first.quotaValue !== undefined) quotaValue = String(first.quotaValue);
            }
          }
        }
      }
    } catch {
      // Keep rawMessage fallback if not JSON
    }
  }

  // Fallback regex extraction from human-readable Gemini error text
  if (!retryDelay) {
    const retryMatch = extractedMessage.match(/Please retry in ([0-9.]+s)/i);
    if (retryMatch) retryDelay = retryMatch[1];
  }
  if (!quotaMetric) {
    const metricMatch = extractedMessage.match(/Quota exceeded for metric:\s*([^\s,]+)/i);
    if (metricMatch) quotaMetric = metricMatch[1];
  }
  if (!quotaValue) {
    const limitMatch = extractedMessage.match(/\blimit:\s*(\d+)/i);
    if (limitMatch) quotaValue = limitMatch[1];
  }

  return {
    httpStatus,
    geminiStatus,
    message: sanitizeSecretStrings(extractedMessage),
    quotaMetric,
    quotaId,
    quotaValue,
    retryDelay,
    reason
  };
}

function formatRetryDelay(retryDelay?: string): string | null {
  if (!retryDelay) return null;
  const match = retryDelay.match(/^(\d+(?:\.\d+)?)s$/i);
  if (!match) return retryDelay;
  const totalSeconds = Math.round(Number(match[1]));
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return retryDelay;
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m (${retryDelay})` : `${hours}h (${retryDelay})`;
  }
  return seconds > 0 ? `${minutes}m ${seconds}s (${retryDelay})` : `${minutes}m (${retryDelay})`;
}

function classifyGeminiError(err: unknown, model: string): GeminiServiceError {
  if (err instanceof GeminiServiceError) return err;

  const parsed = parseGoogleApiError(err);
  const upperMessage = parsed.message.toUpperCase();
  const upperStatus = (parsed.geminiStatus ?? '').toUpperCase();
  const upperMetric = `${parsed.quotaMetric ?? ''} ${parsed.quotaId ?? ''}`.toUpperCase();

  console.error(
    `[GeminiVisualAnalysis] Upstream error (model=${model}, http=${parsed.httpStatus ?? 'unknown'}, status=${parsed.geminiStatus ?? 'unknown'}, metric=${parsed.quotaMetric ?? 'none'}, quotaId=${parsed.quotaId ?? 'none'}, limit=${parsed.quotaValue ?? 'unknown'}, retry=${parsed.retryDelay ?? 'none'}):`,
    parsed.message
  );

  const details = {
    upstreamStatus: parsed.httpStatus,
    geminiStatus: parsed.geminiStatus,
    model,
    quotaMetric: parsed.quotaMetric,
    quotaId: parsed.quotaId,
    quotaLimit: parsed.quotaValue,
    retryDelay: parsed.retryDelay,
    upstreamMessage: parsed.message.replace(/\s+/g, ' ').trim().slice(0, 600)
  };

  // 1. Authentication / credential errors
  if (
    parsed.httpStatus === 401 ||
    parsed.httpStatus === 403 ||
    upperStatus === 'UNAUTHENTICATED' ||
    upperStatus === 'PERMISSION_DENIED' ||
    upperMessage.includes('API_KEY_INVALID') ||
    upperMessage.includes('API KEY NOT VALID')
  ) {
    return new GeminiServiceError(
      'API_KEY_INVALID',
      401,
      `Gemini rejected credentials or permissions for model ${model}: ${parsed.message}`,
      details
    );
  }

  // 2. Temporary service overload (503 UNAVAILABLE / high demand)
  if (
    parsed.httpStatus === 503 ||
    upperStatus === 'UNAVAILABLE' ||
    upperMessage.includes('OVERLOADED') ||
    upperMessage.includes('HIGH DEMAND') ||
    upperMessage.includes('TEMPORARILY UNAVAILABLE')
  ) {
    const formattedRetry = formatRetryDelay(parsed.retryDelay);
    return new GeminiServiceError(
      'SERVICE_OVERLOADED',
      500,
      `Gemini model ${model} is temporarily overloaded or unavailable. ${formattedRetry ? `Retry after ${formattedRetry}.` : 'Wait a moment and retry.'}`,
      details
    );
  }

  // 3. Quota / rate-limit errors (429 / RESOURCE_EXHAUSTED) — distinguish exact cause
  if (
    parsed.httpStatus === 429 ||
    upperStatus === 'RESOURCE_EXHAUSTED' ||
    upperMessage.includes('QUOTA') ||
    upperMessage.includes('RATE LIMIT')
  ) {
    const formattedRetry = formatRetryDelay(parsed.retryDelay);
    const retryNote = formattedRetry ? ` Quota resets in ~${formattedRetry}.` : '';
    const limitNote = parsed.quotaValue ? ` (limit: ${parsed.quotaValue})` : '';

    const isZeroLimit =
      parsed.quotaValue === '0' || /\blimit:\s*0\b/i.test(parsed.message);
    const mentionsFreeTier =
      upperMessage.includes('FREE_TIER') ||
      upperMessage.includes('FREE TIER') ||
      upperMetric.includes('FREETIER') ||
      upperMetric.includes('FREE_TIER');

    // 3a. Free-tier model access restriction (quota explicitly 0 on free tier)
    if (isZeroLimit && mentionsFreeTier) {
      return new GeminiServiceError(
        'FREE_TIER_MODEL_RESTRICTED',
        429,
        `Free-tier access is restricted for model ${model} (quota limit is 0 on the free tier).`,
        details
      );
    }

    // 3b. Project billing or zero-quota restriction (quota explicitly 0)
    if (isZeroLimit) {
      return new GeminiServiceError(
        'PROJECT_QUOTA_OR_BILLING',
        429,
        `Project quota or billing restriction reached for model ${model} (configured quota limit is 0).`,
        details
      );
    }

    // 3c. Daily request quota (RPD) — checked before generic boilerplate "billing" wording
    if (
      upperMetric.includes('PERDAY') ||
      upperMetric.includes('PER_DAY') ||
      upperMessage.includes('PER DAY') ||
      upperMessage.includes('DAILY')
    ) {
      const tierLabel = mentionsFreeTier ? 'free-tier daily request quota' : 'daily request quota';
      return new GeminiServiceError(
        'QUOTA_DAILY_EXCEEDED',
        429,
        `Gemini ${tierLabel}${limitNote} exceeded for model ${model}.${retryNote}`,
        details
      );
    }

    // 3d. Input tokens-per-minute limit (TPM)
    if (
      upperMetric.includes('TOKEN') ||
      upperMessage.includes('TOKENS PER MINUTE') ||
      upperMessage.includes('INPUT_TOKEN')
    ) {
      return new GeminiServiceError(
        'RATE_LIMITED_TPM',
        429,
        `Input tokens-per-minute (TPM) limit${limitNote} reached for model ${model}.${retryNote}`,
        details
      );
    }

    // 3e. Requests-per-minute limit (RPM)
    if (
      upperMetric.includes('PERMINUTE') ||
      upperMetric.includes('PER_MINUTE') ||
      upperMessage.includes('REQUESTS PER MINUTE') ||
      upperMessage.includes('PER MINUTE')
    ) {
      return new GeminiServiceError(
        'RATE_LIMITED_RPM',
        429,
        `Requests-per-minute (RPM) rate limit${limitNote} reached for model ${model}.${retryNote}`,
        details
      );
    }

    // 3f. Project billing or general project quota restriction
    if (
      upperMessage.includes('BILLING') ||
      upperMessage.includes('PAYMENT') ||
      upperMessage.includes('PAID PLAN')
    ) {
      return new GeminiServiceError(
        'PROJECT_QUOTA_OR_BILLING',
        429,
        `Project quota or billing restriction reached for model ${model}${limitNote}.${retryNote}`,
        details
      );
    }

    return new GeminiServiceError(
      'RATE_LIMITED',
      429,
      `Gemini returned 429 RESOURCE_EXHAUSTED for model ${model}: ${details.upstreamMessage}`,
      details
    );
  }

  // 4. Model not found / unavailable
  if (parsed.httpStatus === 404 || upperStatus === 'NOT_FOUND') {
    return new GeminiServiceError(
      'MODEL_UNAVAILABLE',
      500,
      `The configured Gemini model (${model}) was not found or is unavailable: ${details.upstreamMessage}`,
      details
    );
  }

  return new GeminiServiceError(
    'UPSTREAM_ERROR',
    500,
    details.upstreamMessage
      ? `Gemini request failed (${parsed.httpStatus ?? 'upstream error'}): ${details.upstreamMessage}`
      : 'Unable to complete visual interpretation via Gemini right now. Please try again.',
    details
  );
}

function resolveTimeoutMs(): number {
  const raw = process.env.GEMINI_TIMEOUT_MS;
  if (raw !== undefined && raw.trim() !== '') {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 5000 && parsed <= 270000) {
      return Math.round(parsed);
    }
  }
  return env.GEMINI_TIMEOUT_MS;
}

function resolveThinkingLevel(model: string): ThinkingLevel {
  // gemini-3.1-flash-lite defaults to MINIMAL (lowest latency without extra reasoning token overhead);
  // non-lite models (e.g. gemini-4-hydrogen) do not support MINIMAL and use LOW.
  return model.toLowerCase().includes('flash-lite')
    ? ThinkingLevel.MINIMAL
    : ThinkingLevel.LOW;
}

function isAbortOrTimeoutError(err: unknown): boolean {
  if (err instanceof Error) {
    if (err.name === 'AbortError' || err.name === 'TimeoutError') return true;
    const msg = err.message.toLowerCase();
    if (
      msg.includes('aborted') ||
      msg.includes('timed out') ||
      msg.includes('timeout') ||
      msg.includes('deadline exceeded')
    ) {
      return true;
    }
  }
  return false;
}

function normalizeHexUpper(value: string): string {
  return value.trim().toUpperCase();
}

function slugifyRegionName(value: string): string {
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

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boundStringList(value: unknown, maxItems: number, maxChars?: number): unknown {
  if (!Array.isArray(value) || !value.every((entry): entry is string => typeof entry === 'string')) {
    return value;
  }
  return value
    .map((entry) => {
      const trimmed = entry.trim();
      return maxChars !== undefined && trimmed.length > maxChars
        ? trimmed.slice(0, maxChars).trim()
        : trimmed;
    })
    .filter((entry) => entry.length > 0)
    .slice(0, maxItems);
}

function boundOptionalString(value: unknown, maxChars: number): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > maxChars ? trimmed.slice(0, maxChars).trim() : trimmed;
}

function normalizeRawRegionCandidate(candidate: unknown): unknown {
  if (!isPlainRecord(candidate)) return candidate;
  const obs = isPlainRecord(candidate.observations)
    ? {
        ...candidate.observations,
        typography:
          candidate.observations.typography === undefined
            ? null
            : candidate.observations.typography,
        decorativeElements:
          candidate.observations.decorativeElements === undefined
            ? null
            : candidate.observations.decorativeElements
      }
    : candidate.observations;

  return {
    ...candidate,
    name: boundOptionalString(candidate.name, 160),
    description: boundOptionalString(candidate.description, 600),
    observations: obs,
    evidence: boundStringList(candidate.evidence, 8)
  };
}

function validateAndNormalizeServerRegions(rawRegions: unknown): VisualRegion[] {
  if (!Array.isArray(rawRegions)) return [];

  const validRegions: VisualRegion[] = [];
  const usedIds = new Set<string>();

  for (const candidate of rawRegions) {
    if (validRegions.length >= 12) break;
    const prepared = normalizeRawRegionCandidate(candidate);
    const parsed = rawVisualRegionSchema.safeParse(prepared);
    if (!parsed.success) {
      const reason = parsed.error.issues
        .slice(0, 2)
        .map((iss) => `${iss.path.join('.')}: ${iss.message}`)
        .join('; ');
      console.warn(`[GeminiVisualAnalysis] Rejected invalid visualRegion candidate: ${reason}`);
      continue;
    }

    const r = parsed.data;
    const x = roundCoord(r.boundingBox.x);
    const y = roundCoord(r.boundingBox.y);
    // Clamp sub-pixel float rounding overshoot (already validated by Zod)
    const width = roundCoord(Math.min(r.boundingBox.width, 1 - x));
    const height = roundCoord(Math.min(r.boundingBox.height, 1 - y));

    if (width < 0.015 || height < 0.015) {
      continue;
    }

    const baseId = `reg-${r.category}-${slugifyRegionName(r.name)}-${Math.round(x * 100)}-${Math.round(y * 100)}`;
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);

    validRegions.push({
      ...r,
      id,
      boundingBox: { x, y, width, height }
    });
  }

  // Deterministic top-to-bottom, left-to-right ordering
  validRegions.sort((a, b) => {
    const dy = a.boundingBox.y - b.boundingBox.y;
    if (Math.abs(dy) > 0.02) return dy;
    return a.boundingBox.x - b.boundingBox.x;
  });

  return validRegions;
}

function clampNormalizedBox(box: NormalizedBoundingBox): NormalizedBoundingBox | null {
  const x = roundCoord(box.x);
  const y = roundCoord(box.y);
  const width = roundCoord(Math.min(box.width, 1 - x));
  const height = roundCoord(Math.min(box.height, 1 - y));
  if (width < 0.015 || height < 0.015) return null;
  return { x, y, width, height };
}

function computeBoxIoU(a: NormalizedBoundingBox, b: NormalizedBoundingBox): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  if (x2 <= x1 || y2 <= y1) return 0;
  const inter = (x2 - x1) * (y2 - y1);
  const union = a.width * a.height + b.width * b.height - inter;
  return union > 0 ? inter / union : 0;
}

function computeContainmentRatio(
  inner: NormalizedBoundingBox,
  outer: NormalizedBoundingBox
): number {
  const x1 = Math.max(inner.x, outer.x);
  const y1 = Math.max(inner.y, outer.y);
  const x2 = Math.min(inner.x + inner.width, outer.x + outer.width);
  const y2 = Math.min(inner.y + inner.height, outer.y + outer.height);
  if (x2 <= x1 || y2 <= y1) return 0;
  const inter = (x2 - x1) * (y2 - y1);
  const innerArea = inner.width * inner.height;
  return innerArea > 0 ? inter / innerArea : 0;
}

function findContainingRegion(
  box: NormalizedBoundingBox,
  regions: readonly VisualRegion[]
): VisualRegion | null {
  if (regions.length === 0) return null;

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  let best: VisualRegion | null = null;
  let bestScore = 0;

  for (const region of regions) {
    const rb = region.boundingBox;
    const containment = computeContainmentRatio(box, rb);
    const centerInside =
      cx >= rb.x && cx <= rb.x + rb.width && cy >= rb.y && cy <= rb.y + rb.height;
    if (containment < 0.3 && !centerInside) continue;
    // Prefer tightest containing region when overlap is high
    const regionArea = Math.max(0.001, rb.width * rb.height);
    const score = containment * 2 + (centerInside ? 0.5 : 0) - regionArea * 0.15;
    if (score > bestScore) {
      bestScore = score;
      best = region;
    }
  }

  return best;
}

function normalizeRawElementCandidate(candidate: unknown): unknown {
  if (!isPlainRecord(candidate)) return candidate;

  // Pass non-object garbage through to Zod for strict rejection; for box objects,
  // drop invalid/out-of-bounds extra boxes and cap additionalLocations to 6.
  const additionalLocations = Array.isArray(candidate.additionalLocations)
    ? candidate.additionalLocations.every((loc) => isPlainRecord(loc))
      ? candidate.additionalLocations
          .filter((loc) => normalizedBoundingBoxSchema.safeParse(loc).success)
          .slice(0, 6)
      : candidate.additionalLocations
    : candidate.additionalLocations === undefined || candidate.additionalLocations === null
      ? []
      : candidate.additionalLocations;

  const characteristics = isPlainRecord(candidate.characteristics)
    ? {
        ...candidate.characteristics,
        geometry: boundOptionalString(candidate.characteristics.geometry, 240),
        surfaceAndColor: boundOptionalString(candidate.characteristics.surfaceAndColor, 240),
        styleTraits: boundStringList(candidate.characteristics.styleTraits, 6, 80),
        visualRole: boundOptionalString(candidate.characteristics.visualRole, 280)
      }
    : candidate.characteristics;

  return {
    ...candidate,
    name: boundOptionalString(candidate.name, 160),
    subcategory: boundOptionalString(candidate.subcategory, 100),
    description: boundOptionalString(candidate.description, 600),
    additionalLocations,
    characteristics,
    evidence: boundStringList(candidate.evidence, 6)
  };
}

function validateAndNormalizeServerElements(
  rawElements: unknown,
  regions: readonly VisualRegion[]
): VisualElement[] {
  if (!Array.isArray(rawElements)) return [];

  const validElements: VisualElement[] = [];
  const usedIds = new Set<string>();

  for (const candidate of rawElements) {
    if (validElements.length >= 16) break;
    const prepared = normalizeRawElementCandidate(candidate);
    const parsed = rawVisualElementSchema.safeParse(prepared);
    if (!parsed.success) {
      const reason = parsed.error.issues
        .slice(0, 2)
        .map((iss) => `${iss.path.join('.')}: ${iss.message}`)
        .join('; ');
      console.warn(`[GeminiVisualAnalysis] Rejected invalid visualElement candidate: ${reason}`);
      continue;
    }

    const item = parsed.data;
    const primaryBox = clampNormalizedBox(item.boundingBox);
    if (!primaryBox) continue;

    // Deduplicate additional locations so near-identical boxes never inflate repetition count
    const distinctAdditional: NormalizedBoundingBox[] = [];
    for (const extra of item.additionalLocations) {
      const clamped = clampNormalizedBox(extra);
      if (!clamped) continue;
      if (computeBoxIoU(primaryBox, clamped) > 0.65) continue;
      if (distinctAdditional.some((existing) => computeBoxIoU(existing, clamped) > 0.65)) continue;
      distinctAdditional.push(clamped);
    }

    const parentRegion = findContainingRegion(primaryBox, regions);
    const relatedRegionSet = new Set<string>();
    if (parentRegion) relatedRegionSet.add(parentRegion.id);
    for (const loc of distinctAdditional) {
      const reg = findContainingRegion(loc, regions);
      if (reg) relatedRegionSet.add(reg.id);
    }

    const occurrenceCount = 1 + distinctAdditional.length;
    // Strictly prevent claiming repetition from a single visible occurrence
    const repetitionStatus = occurrenceCount >= 2 ? 'recurring' : 'individual';

    const baseId = `el-${item.category}-${slugifyRegionName(item.name)}-${Math.round(primaryBox.x * 100)}-${Math.round(primaryBox.y * 100)}`;
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);

    validElements.push({
      ...item,
      id,
      boundingBox: primaryBox,
      additionalLocations: distinctAdditional,
      repetitionStatus,
      parentRegionId: parentRegion?.id ?? null,
      parentRegionName: parentRegion?.name ?? null,
      relatedRegionIds: Array.from(relatedRegionSet),
      occurrenceCount
    });
  }

  validElements.sort((a, b) => {
    const dy = a.boundingBox.y - b.boundingBox.y;
    if (Math.abs(dy) > 0.02) return dy;
    return a.boundingBox.x - b.boundingBox.x;
  });

  return validElements;
}

function normalizeRawPatternCandidate(candidate: unknown): unknown {
  if (!isPlainRecord(candidate)) return candidate;

  const rawCount = candidate.occurrenceCount;
  const boundedCount =
    typeof rawCount === 'number' && Number.isInteger(rawCount) && rawCount >= 2
      ? Math.min(20, rawCount)
      : rawCount;

  return {
    ...candidate,
    name: boundOptionalString(candidate.name, 160),
    description: boundOptionalString(candidate.description, 600),
    elementNames: boundStringList(candidate.elementNames, 8),
    occurrenceCount: boundedCount,
    evidence: boundStringList(candidate.evidence, 6)
  };
}

function validateAndNormalizeServerPatterns(
  rawPatterns: unknown,
  elements: readonly VisualElement[]
): PatternRelationship[] {
  if (!Array.isArray(rawPatterns) || elements.length === 0) return [];

  const validPatterns: PatternRelationship[] = [];
  const usedIds = new Set<string>();

  const elementByLowerName = new Map<string, VisualElement>();
  for (const el of elements) {
    elementByLowerName.set(el.name.trim().toLowerCase(), el);
  }

  for (const candidate of rawPatterns) {
    if (validPatterns.length >= 8) break;
    const prepared = normalizeRawPatternCandidate(candidate);
    const parsed = rawPatternRelationshipSchema.safeParse(prepared);
    if (!parsed.success) continue;

    const item = parsed.data;
    const matchedElements: VisualElement[] = [];
    const seenElIds = new Set<string>();

    for (const rawName of item.elementNames) {
      const needle = rawName.trim().toLowerCase();
      let found = elementByLowerName.get(needle);
      if (!found) {
        found = elements.find(
          (el) =>
            el.name.toLowerCase().includes(needle) || needle.includes(el.name.toLowerCase())
        );
      }
      if (found && !seenElIds.has(found.id)) {
        seenElIds.add(found.id);
        matchedElements.push(found);
      }
    }

    if (matchedElements.length === 0) continue;

    // Count verified distinct screenshot locations across linked elements
    const allBoxes: NormalizedBoundingBox[] = [];
    for (const el of matchedElements) {
      const boxes = [el.boundingBox, ...el.additionalLocations];
      for (const b of boxes) {
        if (!allBoxes.some((existing) => computeBoxIoU(existing, b) > 0.65)) {
          allBoxes.push(b);
        }
      }
    }

    // Strict anti-hallucination gate: never form a recurring pattern from < 2 distinct verified locations
    if (allBoxes.length < 2) continue;

    const regionIdSet = new Set<string>();
    for (const el of matchedElements) {
      for (const rId of el.relatedRegionIds) {
        regionIdSet.add(rId);
      }
    }

    const baseId = `pat-${item.patternType}-${slugifyRegionName(item.name)}`;
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);

    validPatterns.push({
      id,
      name: item.name.trim(),
      patternType: item.patternType,
      description: item.description.trim(),
      elementIds: matchedElements.map((e) => e.id),
      regionIds: Array.from(regionIdSet),
      occurrenceCount: allBoxes.length,
      confidence: item.confidence,
      evidence: item.evidence.map((e) => e.trim()).filter(Boolean)
    });
  }

  return validPatterns;
}

export function normalizeAndValidateVisualInterpretation(
  parsedJson: unknown,
  measuredPalette: VisualAnalysisRequest['measuredPalette']
): VisualInterpretation {
  // Pre-bound top-level M5 arrays and normalize optional nullable fields, and validate M8/M9
  // candidates individually so oversized valid arrays or a single invalid candidate never break M5 core outputs.
  let sanitizedPayload: unknown = parsedJson;
  if (isPlainRecord(parsedJson)) {
    const rawObj = parsedJson;
    const normalizedRegions = validateAndNormalizeServerRegions(rawObj.visualRegions);
    const normalizedElements = validateAndNormalizeServerElements(
      rawObj.visualElements,
      normalizedRegions
    );
    const normalizedPatterns = validateAndNormalizeServerPatterns(
      rawObj.patternRelationships,
      normalizedElements
    );
    // Upgrade element repetitionStatus to 'recurring' if it participates in a verified multi-location pattern relationship
    const recurringFromPatternIds = new Set(normalizedPatterns.flatMap((p) => p.elementIds));
    const finalElements = normalizedElements.map((el) =>
      recurringFromPatternIds.has(el.id) && el.repetitionStatus === 'individual'
        ? { ...el, repetitionStatus: 'recurring' as const }
        : el
    );

    const boundedSemanticColors = Array.isArray(rawObj.semanticColors)
      ? rawObj.semanticColors.slice(0, 10).map((entry) =>
          isPlainRecord(entry)
            ? {
                ...entry,
                matchedMeasuredHex:
                  entry.matchedMeasuredHex === undefined ? null : entry.matchedMeasuredHex
              }
            : entry
        )
      : rawObj.semanticColors;

    const boundedTypography = isPlainRecord(rawObj.typography)
      ? {
          ...rawObj.typography,
          hierarchy: Array.isArray(rawObj.typography.hierarchy)
            ? rawObj.typography.hierarchy.slice(0, 8)
            : rawObj.typography.hierarchy
        }
      : rawObj.typography;

    const boundedSpacing = isPlainRecord(rawObj.spacing)
      ? {
          ...rawObj.spacing,
          scaleSteps: Array.isArray(rawObj.spacing.scaleSteps)
            ? rawObj.spacing.scaleSteps.slice(0, 8)
            : rawObj.spacing.scaleSteps
        }
      : rawObj.spacing;

    const boundedComponents = Array.isArray(rawObj.components)
      ? rawObj.components.slice(0, 10)
      : rawObj.components;

    const boundedLayout = isPlainRecord(rawObj.layout)
      ? {
          ...rawObj.layout,
          regions: Array.isArray(rawObj.layout.regions)
            ? rawObj.layout.regions.slice(0, 8)
            : rawObj.layout.regions
        }
      : rawObj.layout;

    const boundedEffects = isPlainRecord(rawObj.effects)
      ? {
          ...rawObj.effects,
          borderRadiusScale: Array.isArray(rawObj.effects.borderRadiusScale)
            ? rawObj.effects.borderRadiusScale.slice(0, 6)
            : rawObj.effects.borderRadiusScale
        }
      : rawObj.effects;

    sanitizedPayload = {
      ...rawObj,
      semanticColors: boundedSemanticColors,
      typography: boundedTypography,
      spacing: boundedSpacing,
      components: boundedComponents,
      layout: boundedLayout,
      effects: boundedEffects,
      visualRegions: normalizedRegions,
      visualElements: finalElements,
      patternRelationships: normalizedPatterns
    };
  }

  const validated = visualInterpretationSchema.safeParse(sanitizedPayload);
  if (!validated.success) {
    throw new GeminiServiceError(
      'INVALID_AI_RESPONSE',
      500,
      'Gemini visual interpretation response failed schema validation.'
    );
  }

  // Normalize HEX formatting to uppercase for consistent comparison against M4 measured values
  const measuredSet = new Set(measuredPalette.map((c) => normalizeHexUpper(c.hex)));
  return {
    ...validated.data,
    semanticColors: validated.data.semanticColors.map((item) => {
      const hex = normalizeHexUpper(item.hex);
      const matched =
        item.matchedMeasuredHex && measuredSet.has(normalizeHexUpper(item.matchedMeasuredHex))
          ? normalizeHexUpper(item.matchedMeasuredHex)
          : measuredSet.has(hex)
            ? hex
            : null;
      return {
        ...item,
        hex,
        matchedMeasuredHex: matched
      };
    })
  };
}

export async function analyzeScreenshotVisuals(
  request: VisualAnalysisRequest,
  context: VisualAnalysisContext = {}
): Promise<VisualAnalysisResult> {
  const ai = getGeminiClient();
  const model = (process.env.GEMINI_MODEL || env.GEMINI_MODEL || 'gemini-3.1-flash-lite').trim();
  const timeoutMs = resolveTimeoutMs();
  const thinkingLevel = resolveThinkingLevel(model);
  const requestId = context.requestId ?? 'internal';
  const startedAt = performance.now();

  const imagePart = {
    inlineData: {
      mimeType: request.mimeType,
      data: request.imageBase64
    }
  };

  const promptText = buildPromptText(request);
  const textPart = {
    text: promptText
  };

  const requestAbortController = new AbortController();
  let timedOut = false;

  const timeoutHandle = setTimeout(() => {
    timedOut = true;
    requestAbortController.abort(new Error(`Gemini request exceeded ${timeoutMs}ms timeout`));
  }, timeoutMs);

  const handleExternalAbort = () => {
    requestAbortController.abort(
      context.signal?.reason ?? new Error('Caller aborted visual analysis request')
    );
  };

  if (context.signal) {
    if (context.signal.aborted) {
      clearTimeout(timeoutHandle);
      handleExternalAbort();
    } else {
      context.signal.addEventListener('abort', handleExternalAbort, { once: true });
    }
  }

  const geminiStartedAt = performance.now();
  logServiceStage('gemini_request_started', {
    requestId,
    model,
    thinkingLevel,
    timeoutMs,
    mimeType: request.mimeType,
    dimensions: `${request.dimensions.width}x${request.dimensions.height}`,
    imageBase64Bytes: request.imageBase64.length,
    promptChars: promptText.length
  });

  let response: GenerateContentResponse;
  try {
    // Single deliberate request with explicit timeout (no retry loop that could multiply latency or API usage)
    response = await ai.models.generateContent({
      model,
      contents: { parts: [imagePart, textPart] },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: VISUAL_INTERPRETATION_RESPONSE_SCHEMA,
        thinkingConfig: {
          thinkingLevel
        },
        abortSignal: requestAbortController.signal,
        httpOptions: {
          timeout: timeoutMs
        }
      }
    });
  } catch (err) {
    const elapsedMs = Math.max(1, Math.round(performance.now() - geminiStartedAt));

    if (context.signal?.aborted && !timedOut) {
      throw err;
    }

    if (timedOut || isAbortOrTimeoutError(err)) {
      const timeoutSeconds = Math.round(timeoutMs / 1000);
      console.error(
        `[GeminiVisualAnalysis] requestId=${requestId} timeout model=${model} timeoutMs=${timeoutMs} elapsedMs=${elapsedMs}`
      );
      throw new GeminiServiceError(
        'ANALYSIS_TIMEOUT',
        504,
        `Visual interpretation timed out after ${timeoutSeconds} seconds while waiting for Gemini (${model}). Please retry or try a smaller screenshot.`,
        {
          model,
          timeoutMs,
          elapsedMs,
          upstreamMessage: `Upstream Gemini call exceeded ${timeoutMs}ms server timeout`
        }
      );
    }

    throw classifyGeminiError(err, model);
  } finally {
    clearTimeout(timeoutHandle);
    if (context.signal) {
      context.signal.removeEventListener('abort', handleExternalAbort);
    }
  }

  const geminiMs = Math.max(1, Math.round(performance.now() - geminiStartedAt));
  const rawText = response?.text?.trim();
  const usage = response?.usageMetadata;

  logServiceStage('gemini_response_received', {
    requestId,
    geminiMs,
    responseChars: rawText?.length ?? 0,
    promptTokens: usage?.promptTokenCount,
    candidatesTokens: usage?.candidatesTokenCount,
    thoughtsTokens: usage?.thoughtsTokenCount
  });

  if (!rawText) {
    throw new GeminiServiceError(
      'INVALID_AI_RESPONSE',
      500,
      'Gemini returned an empty response for visual interpretation.'
    );
  }

  const parseStartedAt = performance.now();
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    throw new GeminiServiceError(
      'INVALID_AI_RESPONSE',
      500,
      'Gemini returned malformed JSON that could not be parsed.'
    );
  }

  const normalizedInterpretation = normalizeAndValidateVisualInterpretation(
    parsedJson,
    request.measuredPalette
  );

  const parseMs = Math.max(0, Math.round(performance.now() - parseStartedAt));
  logServiceStage('parsing_completed', {
    requestId,
    parseMs,
    regions: normalizedInterpretation.visualRegions.length,
    elements: normalizedInterpretation.visualElements.length,
    patterns: normalizedInterpretation.patternRelationships.length
  });

  const durationMs = Math.max(1, Math.round(performance.now() - startedAt));

  return {
    interpretation: normalizedInterpretation,
    meta: {
      model,
      durationMs,
      analyzedAt: new Date().toISOString()
    }
  };
}
