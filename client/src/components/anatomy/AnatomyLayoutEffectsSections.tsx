import React from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Focus,
  Maximize2,
  Wand2
} from 'lucide-react';
import { normalizedBoxToPixels } from '../../services/investigation/regionSchema';
import type {
  AnatomyEffectsSection,
  AnatomyLayoutSection,
  CropLightboxTarget
} from '../../types/anatomyBoard';
import {
  ELEMENT_CATEGORY_SHORT_LABELS,
  REGION_CATEGORY_SHORT_LABELS,
  type ElementVisualAssets,
  type InvestigationSelection,
  type NormalizedBoundingBox
} from '../../types/investigation';
import type { UploadedImage } from '../../types/upload';
import {
  BoardSectionHeader,
  CONFIDENCE_TEXT_STYLE,
  ProvenanceInline,
  SectionUnavailableNotice
} from './AnatomyShared';

export interface AnatomyLayoutSectionProps {
  layout: AnatomyLayoutSection;
  image: UploadedImage;
  onInspectInWorkspace: (
    selection: InvestigationSelection,
    targetBox?: NormalizedBoundingBox | null
  ) => void;
  onRunVisualAnalysis?: () => void;
  canRunVisualAi: boolean;
}

export const AnatomyLayoutSectionView: React.FC<AnatomyLayoutSectionProps> = ({
  layout,
  image,
  onInspectInWorkspace,
  onRunVisualAnalysis,
  canRunVisualAi
}) => {
  return (
    <section
      id="anatomy-layout"
      aria-label="Layout and Composition"
      className="bg-surface border border-border rounded-xl p-5 sm:p-7 space-y-6 scroll-mt-24"
    >
      <BoardSectionHeader
        index="06"
        title="Layout & Composition"
        subtitle="Proportional page blueprint derived from M8 region bounds paired with M5 grid structure, alignment, whitespace density, and spatial rhythm."
        provenanceLabel="M8 Regions + AI-Inferred"
        provenanceKind="ai-inferred"
        confidence={layout.confidence}
      />

      {!layout.available ? (
        <SectionUnavailableNotice
          title="Layout and spatial composition not yet analysed"
          description="Run AI Visual Interpretation to map grid geometry, container alignment, whitespace density, and clickable section proportions."
          action={
            canRunVisualAi &&
            onRunVisualAnalysis && (
              <button
                type="button"
                onClick={onRunVisualAnalysis}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-accent hover:bg-accent-hover text-[#051315] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <Wand2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Run Visual AI</span>
              </button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Interactive M8 Proportional Wireframe Blueprint */}
          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-xs font-semibold text-ink">
                Proportional Spatial Blueprint
              </h3>
              <span className="font-mono text-[11px] text-muted tabular-nums">
                {layout.detectedRegions.length > 0
                  ? `${layout.detectedRegions.length} M8 region${layout.detectedRegions.length === 1 ? '' : 's'} · click to inspect`
                  : 'No M8 bounding boxes verified'}
              </span>
            </div>

            {layout.detectedRegions.length > 0 ? (
              <div
                className="relative w-full rounded-xl border border-border bg-canvas overflow-hidden"
                style={{
                  aspectRatio: `${image.width} / ${image.height}`,
                  maxHeight: '360px',
                  backgroundImage:
                    'radial-gradient(rgba(145, 162, 165, 0.14) 1px, transparent 1px)',
                  backgroundSize: '18px 18px'
                }}
              >
                {layout.detectedRegions.map((region, idx) => {
                  const { x, y, width, height } = region.boundingBox;
                  return (
                    <button
                      key={region.id}
                      type="button"
                      data-anatomy-region={region.id}
                      onClick={() =>
                        onInspectInWorkspace({ kind: 'region', id: region.id }, region.boundingBox)
                      }
                      title={`Inspect region "${region.name}" in Visual Investigation`}
                      style={{
                        left: `${x * 100}%`,
                        top: `${y * 100}%`,
                        width: `${width * 100}%`,
                        height: `${height * 100}%`
                      }}
                      className="group absolute rounded-[4px] border border-accent/65 bg-accent/[0.08] hover:bg-accent/[0.18] hover:border-accent hover:z-20 transition-all duration-150 p-1.5 flex flex-col justify-between text-left overflow-hidden cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      <span className="text-[10px] font-mono font-semibold text-accent truncate leading-tight">
                        {String(idx + 1).padStart(2, '0')} · {region.name}
                      </span>
                      <span className="text-[9px] font-mono text-muted group-hover:text-ink truncate">
                        {REGION_CATEGORY_SHORT_LABELS[region.category]} ·{' '}
                        {Math.round(width * 100)}%×{Math.round(height * 100)}%
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-canvas/70 p-6 text-xs text-muted">
                No verified M8 region coordinates were returned for this screenshot. Textual
                layout observations from M5 are shown alongside.
              </div>
            )}

            {/* Region quick list */}
            {layout.detectedRegions.length > 0 && (
              <div className="divide-y divide-border rounded-xl border border-border bg-canvas/70">
                {layout.detectedRegions.map((reg, idx) => (
                  <button
                    key={`${reg.id}-row`}
                    type="button"
                    onClick={() =>
                      onInspectInWorkspace({ kind: 'region', id: reg.id }, reg.boundingBox)
                    }
                    className="w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-elevated/60 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 flex items-baseline gap-2">
                      <span className="font-mono text-[10px] text-faint tabular-nums">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="text-xs font-medium text-ink truncate">{reg.name}</span>
                      <span className="text-[11px] text-muted truncate">
                        {REGION_CATEGORY_SHORT_LABELS[reg.category]}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] text-accent shrink-0">
                      <span className="font-mono tabular-nums">
                        {Math.round(reg.boundingBox.width * 100)}%×
                        {Math.round(reg.boundingBox.height * 100)}%
                      </span>
                      <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Structural Composition, Grid, Alignment & Whitespace Rhythm */}
          <div className="lg:col-span-6 space-y-5">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-border bg-canvas/75 p-4 text-xs">
              {layout.structureType && (
                <div className="space-y-0.5">
                  <dt className="text-[11px] text-faint">Page Composition</dt>
                  <dd className="text-ink font-medium leading-relaxed">{layout.structureType}</dd>
                </div>
              )}
              {layout.gridColumns && (
                <div className="space-y-0.5">
                  <dt className="text-[11px] text-faint">Grid Structure</dt>
                  <dd className="text-ink font-medium leading-relaxed">{layout.gridColumns}</dd>
                </div>
              )}
              {layout.alignment && (
                <div className="space-y-0.5">
                  <dt className="text-[11px] text-faint">Alignment</dt>
                  <dd className="text-ink font-medium leading-relaxed">{layout.alignment}</dd>
                </div>
              )}
              {layout.contentWidth && (
                <div className="space-y-0.5">
                  <dt className="text-[11px] text-faint">Content Measure</dt>
                  <dd className="text-ink font-medium leading-relaxed">{layout.contentWidth}</dd>
                </div>
              )}
            </dl>

            {/* Spacing, Whitespace & Density */}
            {layout.spacing && (
              <div className="rounded-xl border border-border bg-canvas/75 p-4 space-y-3.5">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-xs font-semibold text-ink">
                    Whitespace &amp; Spacing Rhythm
                  </h3>
                  <ProvenanceInline
                    provenance="ai-inferred"
                    confidence={layout.spacing.confidence}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <span>
                    Base unit:{' '}
                    <span className="font-mono text-ink">{layout.spacing.baseUnit}</span>
                  </span>
                  <span className="text-border-strong" aria-hidden="true">
                    ·
                  </span>
                  <span>
                    Density:{' '}
                    <span className="text-ink capitalize">{layout.spacing.density}</span>
                  </span>
                  <span className="text-border-strong" aria-hidden="true">
                    ·
                  </span>
                  <span>
                    Container padding:{' '}
                    <span className="font-mono text-ink">{layout.spacing.containerPadding}</span>
                  </span>
                </div>

                <p className="text-xs text-muted leading-relaxed">
                  {layout.spacing.sectionRhythm}
                </p>

                {layout.spacing.scaleSteps.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {layout.spacing.scaleSteps.slice(0, 6).map((step, idx) => {
                      const pxNum = Number(step.value.match(/(\d+)/)?.[1] ?? 12);
                      const barWidth = Math.min(100, Math.max(8, (pxNum / 64) * 100));
                      return (
                        <div
                          key={`${step.token}-${idx}`}
                          className="grid grid-cols-12 items-center gap-2 text-[11px]"
                        >
                          <span className="col-span-3 font-mono text-accent truncate">
                            {step.token}
                          </span>
                          <span className="col-span-2 font-mono text-ink tabular-nums">
                            {step.value}
                          </span>
                          <div className="col-span-3 h-2 rounded-sm bg-elevated overflow-hidden">
                            <div
                              className="h-full bg-accent/70 rounded-sm"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                          <span className="col-span-4 text-muted truncate" title={step.usage}>
                            {step.usage}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* M5 Section Proportions Table */}
            {layout.inferredRegions.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted">
                  Section Hierarchy &amp; Proportions
                </h3>
                <div className="divide-y divide-border rounded-xl border border-border bg-canvas/75">
                  {layout.inferredRegions.map((reg, idx) => (
                    <div
                      key={`${reg.name}-${idx}`}
                      className="px-3.5 py-2.5 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-ink">{reg.name}</p>
                        <p className="text-[11px] text-muted leading-relaxed">{reg.role}</p>
                      </div>
                      <span className="font-mono text-[11px] text-accent shrink-0">
                        {reg.proportion}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export interface AnatomyEffectsSectionProps {
  effects: AnatomyEffectsSection;
  elementAssets: Record<string, ElementVisualAssets>;
  image: UploadedImage;
  onExpandCrop: (target: CropLightboxTarget) => void;
  onInspectInWorkspace: (
    selection: InvestigationSelection,
    targetBox?: NormalizedBoundingBox | null
  ) => void;
  onRunVisualAnalysis?: () => void;
  canRunVisualAi: boolean;
}

export const AnatomyEffectsSectionView: React.FC<AnatomyEffectsSectionProps> = ({
  effects,
  elementAssets,
  image,
  onExpandCrop,
  onInspectInWorkspace,
  onRunVisualAnalysis,
  canRunVisualAi
}) => {
  const surfaceSpecimens = [...effects.surfaceElements, ...effects.decorativeElements];

  return (
    <section
      id="anatomy-effects"
      aria-label="Effects and Surface Language"
      className="bg-surface border border-border rounded-xl p-5 sm:p-7 space-y-6 scroll-mt-24"
    >
      <BoardSectionHeader
        index="07"
        title="Effects & Surface Language"
        subtitle="Elevation philosophy, borders, shadows, surface textures, layering, and decorative treatments — clearly distinguishing directly visible surfaces from inferred effects."
        provenanceLabel="AI-Inferred + Visible Crops"
        provenanceKind="ai-inferred"
        confidence={effects.confidence}
      />

      {!effects.available ? (
        <SectionUnavailableNotice
          title="Surface and effects analysis not yet available"
          description="Run AI Visual Interpretation to document elevation style, shadows, gradients, border craft, and background textures."
          action={
            canRunVisualAi &&
            onRunVisualAnalysis && (
              <button
                type="button"
                onClick={onRunVisualAnalysis}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-accent hover:bg-accent-hover text-[#051315] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <Wand2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Run Visual AI</span>
              </button>
            )
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Core Material Properties */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-canvas/80 p-4 space-y-1.5">
              <p className="text-[11px] text-faint">Elevation &amp; Layering</p>
              <p className="text-sm font-semibold text-ink capitalize">
                {effects.elevationStyle ? effects.elevationStyle.replace('-', ' ') : 'Unspecified'}
              </p>
              <p className="text-xs text-muted leading-relaxed">
                {effects.notes ?? 'Derived from surface contrast and layering cues on the capture.'}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-canvas/80 p-4 space-y-1.5">
              <p className="text-[11px] text-faint">Border Language</p>
              <p className="text-xs text-ink leading-relaxed">
                {effects.borderStyle ?? 'No prominent border style observed.'}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-canvas/80 p-4 space-y-1.5">
              <p className="text-[11px] text-faint">Shadows, Blur &amp; Transparency</p>
              <p className="text-xs text-ink leading-relaxed">
                {effects.shadowStyle ?? 'No drop shadows or translucency effects verified.'}
              </p>
              {effects.confidence === 'low' && (
                <p className="inline-flex items-center gap-1 text-[11px] text-[#F87171] pt-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
                  <span>Low-confidence visual inference</span>
                </p>
              )}
            </div>
          </div>

          {/* M6 Shadow Tokens (if any) */}
          {effects.shadowTokens.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold text-muted">Normalised Shadow Tokens</h3>
              <div className="divide-y divide-border rounded-xl border border-border bg-canvas/70">
                {effects.shadowTokens.map((tok) => (
                  <div
                    key={tok.cssVariable}
                    className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-mono text-accent">{tok.cssVariable}</span>
                      <span className="mx-2 text-border-strong" aria-hidden="true">
                        ·
                      </span>
                      <span className="font-mono text-muted">{tok.value}</span>
                    </div>
                    <ProvenanceInline provenance={tok.provenance} confidence={tok.confidence} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* M9 Visible Surface / Texture / Decorative Crops */}
          {surfaceSpecimens.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-xs font-semibold text-muted">
                  Observed Textures, Gradients &amp; Surface Details
                </h3>
                <span className="font-mono text-[11px] text-faint tabular-nums">
                  {surfaceSpecimens.length} cropped specimen
                  {surfaceSpecimens.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {surfaceSpecimens.map((el) => {
                  const a = elementAssets[el.id];
                  const cropUrl = a?.primaryCropUrl ?? null;
                  const px = normalizedBoxToPixels(el.boundingBox, image.width, image.height);
                  const surfaceBasisLabel =
                    el.surfaceBasis === 'directly-visible-surface'
                      ? 'Directly visible surface'
                      : 'Inferred visual effect';

                  return (
                    <article
                      key={`effect-${el.id}`}
                      className="rounded-xl border border-border bg-canvas/80 overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        <div className="relative h-28 border-b border-border bg-[#060A0C] p-3 flex items-center justify-center overflow-hidden">
                          {cropUrl ? (
                            <img
                              src={cropUrl}
                              alt={`Surface specimen crop of ${el.name}`}
                              className="max-h-24 max-w-full object-contain rounded-sm"
                            />
                          ) : (
                            <span className="text-xs text-faint">Surface reference</span>
                          )}
                          {cropUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                onExpandCrop({
                                  title: el.name,
                                  categoryLabel: `${ELEMENT_CATEGORY_SHORT_LABELS[el.category]} · ${surfaceBasisLabel}`,
                                  cropUrl,
                                  occurrenceCropUrls: a?.occurrenceCropUrls ?? [cropUrl],
                                  description: el.description,
                                  provenance: 'ai-inferred',
                                  confidence: el.confidence,
                                  evidence: el.evidence,
                                  parentRegionId: el.parentRegionId,
                                  parentRegionName: el.parentRegionName,
                                  measuredColors: (a?.measuredColors ?? []).map((c) => ({
                                    hex: c.hex,
                                    percentage: c.percentage
                                  })),
                                  selection: { kind: 'element', id: el.id },
                                  targetBox: el.boundingBox,
                                  pixelDimensions: { width: px.width, height: px.height }
                                })
                              }
                              aria-label={`Expand surface crop for ${el.name}`}
                              className="absolute top-2 right-2 w-7 h-7 rounded-md border border-border bg-[#070B0D]/85 text-muted hover:text-ink hover:border-accent-border flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                        <div className="p-3.5 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-semibold text-ink">{el.name}</h4>
                            <span
                              className={`text-[11px] font-medium capitalize shrink-0 ${CONFIDENCE_TEXT_STYLE[el.confidence]}`}
                            >
                              {el.confidence}
                            </span>
                          </div>
                          <p className="text-[11px] text-accent">{surfaceBasisLabel}</p>
                          <p className="text-xs text-muted leading-relaxed line-clamp-2">
                            {el.characteristics.surfaceAndColor}
                          </p>
                        </div>
                      </div>

                      <div className="px-3.5 py-2 border-t border-border bg-surface/60 flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-faint truncate">
                          {el.parentRegionName ?? 'Full capture'}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onInspectInWorkspace({ kind: 'element', id: el.id }, el.boundingBox)
                          }
                          className="inline-flex items-center gap-1 text-accent hover:text-accent-hover font-medium transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <Focus className="w-3 h-3" aria-hidden="true" />
                          <span>Locate</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
