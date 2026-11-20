import { ThinkingLevel, Type, type GenerateContentResponse, type Schema } from '@google/genai';
import { env } from '../config/env.js';
import {
  rawVisualRegionSchema,
  visualInterpretationSchema,
  type VisualAnalysisRequest,
  type VisualInterpretation,
  type VisualRegion
} from '../schemas/visualAnalysis.schema.js';
import { GeminiServiceError, getGeminiClient } from './geminiClient.js';

export interface VisualAnalysisResult {
  interpretation: VisualInterpretation;
  meta: {
    model: string;
    durationMs: number;
    analyzedAt: string;
  };
}

const CONFIDENCE_SCHEMA: Schema = {
  type: Type.STRING,
  enum: ['high', 'medium', 'low']
};

const VISUAL_INTERPRETATION_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  required: [
    'summary',
    'semanticColors',
    'typography',
    'spacing',
    'components',
    'layout',
    'effects',
    'visualRegions'
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
          boundingBox: {
            type: Type.OBJECT,
            description:
              'Normalized screenshot-relative coordinates where all values are decimals between 0.0 and 1.0, and x + width <= 1.0, y + height <= 1.0.',
            required: ['x', 'y', 'width', 'height'],
            properties: {
              x: {
                type: Type.NUMBER,
                minimum: 0,
                maximum: 1,
                description: 'Left edge fraction (0.0 to 1.0)'
              },
              y: {
                type: Type.NUMBER,
                minimum: 0,
                maximum: 1,
                description: 'Top edge fraction (0.0 to 1.0)'
              },
              width: {
                type: Type.NUMBER,
                minimum: 0.02,
                maximum: 1,
                description: 'Width fraction (0.02 to 1.0, x + width <= 1.0)'
              },
              height: {
                type: Type.NUMBER,
                minimum: 0.02,
                maximum: 1,
                description: 'Height fraction (0.02 to 1.0, y + height <= 1.0)'
              }
            }
          },
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
    }
  }
};

const SYSTEM_INSTRUCTION = [
  'You are a senior design systems architect analysing a website or application screenshot.',
  'Return concise, grounded, developer-friendly visual design system interpretations strictly in the requested JSON schema.',
  'Important grounding rules:',
  '1. You are given a measured pixel colour palette extracted deterministically from the image. Always prefer anchoring semanticColors.hex and semanticColors.matchedMeasuredHex to those exact measured HEX values when they match a visual role (e.g., background, surface, primary_text, primary_brand, accent, border). If a visible semantic role (such as a small text or border colour) was too small to appear in the measured palette, provide your best visual #RRGGBB estimate for hex and set matchedMeasuredHex to null.',
  '2. Never fabricate proprietary font names with false certainty — describe the typographic classification and close reference families honestly (e.g., "Geometric sans-serif (similar to Plus Jakarta Sans / Inter)").',
  '3. Keep descriptions concise, technical, and directly observable from the screenshot. Do not invent components, sections, or shadows that are not visibly present. Never claim to have inspected hidden HTML, CSS, or DOM source code.',
  '4. Calibrate confidence honestly (high, medium, low) based on visual clarity in the screenshot.',
  '5. All hex values must be valid 6-digit uppercase hex codes like #FFFFFF.',
  '6. For visualRegions, identify 4 to 10 visually distinct, genuinely visible regions of the screenshot (such as header/navigation, hero, main content, cards/containers, primary buttons/CTAs, text blocks, media/charts, footer, or decorative visual accents).',
  '7. Every visualRegions[].boundingBox MUST use normalised decimal coordinates between 0.0 and 1.0 relative to the full screenshot (x = left edge / totalWidth, y = top edge / totalHeight, width = boxWidth / totalWidth, height = boxHeight / totalHeight), with x >= 0, y >= 0, width > 0.02, height > 0.02, x + width <= 1.0, and y + height <= 1.0. NEVER use pixel coordinates or 0-1000 integers.',
  '8. Set boundaryPrecision to "precise" only when edges are visually crisp (e.g. bordered cards, navbars, solid buttons), and "approximate" when edges fade into background whitespace. If a region cannot be located reliably, omit it instead of guessing arbitrary boxes.'
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
    'Infer the structured design system properties across semantic colour roles, typography hierarchy, spacing rhythm, visible UI components, layout structure, visual effects (borders, radii, shadows), and screenshot-relative visualRegions with normalised [0.0..1.0] bounding boxes.'
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

function isRetryableError(err: unknown): boolean {
  const status =
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof (err as { status?: unknown }).status === 'number'
      ? (err as { status: number }).status
      : undefined;

  if (status !== undefined) {
    return status >= 500 || status === 408;
  }

  const msg = err instanceof Error ? err.message.toLowerCase() : '';
  return (
    msg.includes('fetch failed') ||
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('econnreset')
  );
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
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

function validateAndNormalizeServerRegions(rawRegions: unknown): VisualRegion[] {
  if (!Array.isArray(rawRegions)) return [];

  const validRegions: VisualRegion[] = [];
  const usedIds = new Set<string>();

  for (const candidate of rawRegions) {
    if (validRegions.length >= 12) break;
    const parsed = rawVisualRegionSchema.safeParse(candidate);
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

export async function analyzeScreenshotVisuals(
  request: VisualAnalysisRequest
): Promise<VisualAnalysisResult> {
  const ai = getGeminiClient();
  const model = (process.env.GEMINI_MODEL || env.GEMINI_MODEL || 'gemini-4-hydrogen').trim();
  const startedAt = performance.now();

  const imagePart = {
    inlineData: {
      mimeType: request.mimeType,
      data: request.imageBase64
    }
  };

  const textPart = {
    text: buildPromptText(request)
  };

  let response: GenerateContentResponse | null = null;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      response = await ai.models.generateContent({
        model,
        contents: { parts: [imagePart, textPart] },
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: VISUAL_INTERPRETATION_RESPONSE_SCHEMA,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW
          }
        }
      });
      break;
    } catch (err) {
      if (attempt < maxAttempts && isRetryableError(err)) {
        await sleep(400 * Math.pow(2, attempt - 1));
        continue;
      }
      throw classifyGeminiError(err, model);
    }
  }

  const rawText = response?.text?.trim();
  if (!rawText) {
    throw new GeminiServiceError(
      'INVALID_AI_RESPONSE',
      500,
      'Gemini returned an empty response for visual interpretation.'
    );
  }

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

  // Pre-validate and filter visualRegions individually so a single malformed box is rejected cleanly without breaking M5 core outputs
  const sanitizedPayload =
    typeof parsedJson === 'object' && parsedJson !== null
      ? {
          ...(parsedJson as Record<string, unknown>),
          visualRegions: validateAndNormalizeServerRegions(
            (parsedJson as Record<string, unknown>).visualRegions
          )
        }
      : parsedJson;

  const validated = visualInterpretationSchema.safeParse(sanitizedPayload);
  if (!validated.success) {
    throw new GeminiServiceError(
      'INVALID_AI_RESPONSE',
      500,
      'Gemini visual interpretation response failed schema validation.'
    );
  }

  // Normalize HEX formatting to uppercase for consistent comparison against M4 measured values
  const measuredSet = new Set(request.measuredPalette.map((c) => normalizeHexUpper(c.hex)));
  const normalizedInterpretation: VisualInterpretation = {
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
