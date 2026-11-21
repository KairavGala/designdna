import React from 'react';
import {
  ArrowUpRight,
  Focus,
  Layers,
  Maximize2,
  Repeat,
  Wand2
} from 'lucide-react';
import { normalizedBoxToPixels } from '../../services/investigation/regionSchema';
import type {
  AnatomyComponentsSection,
  AnatomyPatternsSection,
  CropLightboxTarget
} from '../../types/anatomyBoard';
import {
  ELEMENT_CATEGORY_SHORT_LABELS,
  PATTERN_TYPE_LABELS,
  type ElementVisualAssets,
  type InvestigationSelection,
  type NormalizedBoundingBox,
  type VisualElement,
  type VisualRegion
} from '../../types/investigation';
import type { UploadedImage } from '../../types/upload';
import {
  BoardSectionHeader,
  CONFIDENCE_TEXT_STYLE,
  ProvenanceInline,
  SectionUnavailableNotice
} from './AnatomyShared';

function buildLightboxFromElement(
  element: VisualElement,
  assets: ElementVisualAssets | undefined,
  image: UploadedImage
): CropLightboxTarget | null {
  if (!assets?.primaryCropUrl) return null;
  const px = normalizedBoxToPixels(element.boundingBox, image.width, image.height);
  return {
    title: element.name,
    categoryLabel: `${ELEMENT_CATEGORY_SHORT_LABELS[element.category]} · ${element.subcategory}`,
    cropUrl: assets.primaryCropUrl,
    occurrenceCropUrls: assets.occurrenceCropUrls,
    description: element.description,
    provenance: 'ai-inferred',
    confidence: element.confidence,
    evidence: element.evidence,
    parentRegionId: element.parentRegionId,
    parentRegionName: element.parentRegionName,
    measuredColors: assets.measuredColors.map((c) => ({ hex: c.hex, percentage: c.percentage })),
    selection: { kind: 'element', id: element.id },
    targetBox: element.boundingBox,
    pixelDimensions: { width: px.width, height: px.height }
  };
}

interface ElementSpecimenCardProps {
  element: VisualElement;
  assets: ElementVisualAssets | undefined;
  image: UploadedImage;
  samplingAssets: boolean;
  onExpandCrop: (target: CropLightboxTarget) => void;
  onInspectInWorkspace: (
    selection: InvestigationSelection,
    targetBox?: NormalizedBoundingBox | null
  ) => void;
}

const ElementSpecimenCard: React.FC<ElementSpecimenCardProps> = ({
  element,
  assets,
  image,
  samplingAssets,
  onExpandCrop,
  onInspectInWorkspace
}) => {
  const cropUrl = assets?.primaryCropUrl ?? null;
  const occUrls = assets?.occurrenceCropUrls ?? [];
  const swatches = assets?.measuredColors ?? [];
  const isRecurring = element.repetitionStatus === 'recurring' && occUrls.length >= 2;
  const isComponent = element.category === 'component-style';

  return (
    <article
      data-anatomy-element={element.id}
      className="group rounded-xl border border-border bg-canvas/80 hover:border-border-strong overflow-hidden flex flex-col justify-between transition-colors"
    >
      <div>
        {/* Real Cropped Screenshot Showcase */}
        <div
          className="relative min-h-[144px] border-b border-border bg-[#060A0C] p-3.5 flex items-center justify-center overflow-hidden"
          style={{
            backgroundImage: 'radial-gradient(rgba(145, 162, 165, 0.11) 1px, transparent 1px)',
            backgroundSize: '14px 14px'
          }}
        >
          {isRecurring ? (
            <div className="grid grid-cols-2 gap-2 w-full">
              {occUrls.slice(0, 2).map((url, idx) => (
                <div
                  key={`${element.id}-side-${idx}`}
                  className="rounded-md border border-border/80 bg-[#070B0D] p-2 flex flex-col items-center justify-center gap-1"
                >
                  <img
                    src={url}
                    alt={`Screenshot crop ${idx + 1} of recurring ${element.name}`}
                    className="max-h-20 max-w-full object-contain rounded-sm"
                  />
                  <span className="font-mono text-[10px] text-faint tabular-nums">#{idx + 1}</span>
                </div>
              ))}
            </div>
          ) : cropUrl ? (
            <img
              src={cropUrl}
              alt={`Cropped screenshot preview of ${element.name}`}
              className="max-h-28 max-w-full object-contain rounded-sm shadow-[0_8px_20px_rgba(0,0,0,0.5)] transition-transform duration-200 group-hover:scale-[1.03]"
            />
          ) : (
            <span className="text-xs text-faint">
              {samplingAssets ? 'Cropping screenshot specimen…' : 'Coordinate reference only'}
            </span>
          )}

          {cropUrl && (
            <button
              type="button"
              onClick={() => {
                const target = buildLightboxFromElement(element, assets, image);
                if (target) onExpandCrop(target);
              }}
              aria-label={`Expand crop preview for ${element.name}`}
              title="Expand screenshot crop"
              className="absolute top-2.5 right-2.5 w-7 h-7 rounded-md border border-border bg-[#070B0D]/85 text-muted hover:text-ink hover:border-accent-border flex items-center justify-center transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Details */}
        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold text-ink leading-snug">{element.name}</h4>
            <span
              className={`text-[11px] font-medium capitalize shrink-0 ${CONFIDENCE_TEXT_STYLE[element.confidence]}`}
            >
              {element.confidence}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted">
            <span className={isComponent ? 'text-[#38BDF8]' : 'text-[#F59E0B]'}>
              {ELEMENT_CATEGORY_SHORT_LABELS[element.category]}
            </span>
            <span className="text-border-strong" aria-hidden="true">
              ·
            </span>
            <span className="font-mono tabular-nums">
              {element.repetitionStatus === 'recurring'
                ? `${element.occurrenceCount}× recurring`
                : 'Individual'}
            </span>
            <span className="text-border-strong" aria-hidden="true">
              ·
            </span>
            <span className="text-accent">AI-Inferred</span>
          </div>

          <p className="text-xs text-muted leading-relaxed line-clamp-2">{element.description}</p>

          {swatches.length > 0 && (
            <div className="flex items-center gap-1.5 pt-1">
              {swatches.slice(0, 4).map((sw) => (
                <span
                  key={sw.hex}
                  title={`Measured pixel colour ${sw.hex} (${sw.percentage.toFixed(1)}%)`}
                  className="w-3.5 h-3.5 rounded-[3px] border border-border-strong shrink-0"
                  style={{ backgroundColor: sw.hex }}
                />
              ))}
              <span className="font-mono text-[10px] text-faint">{swatches[0].hex}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Navigation Links back to M8/M9 */}
      <div className="px-4 py-2.5 border-t border-border bg-surface/60 flex items-center justify-between gap-2 text-[11px]">
        {element.parentRegionId && element.parentRegionName ? (
          <button
            type="button"
            onClick={() =>
              onInspectInWorkspace({ kind: 'region', id: element.parentRegionId! }, null)
            }
            className="inline-flex items-center gap-1 text-muted hover:text-ink transition-colors truncate cursor-pointer"
          >
            <Layers className="w-3 h-3 text-accent shrink-0" aria-hidden="true" />
            <span className="truncate">{element.parentRegionName}</span>
          </button>
        ) : (
          <span className="font-mono text-faint tabular-nums">
            @{Math.round(element.boundingBox.x * 100)}%,{Math.round(element.boundingBox.y * 100)}%
          </span>
        )}

        <button
          type="button"
          onClick={() =>
            onInspectInWorkspace({ kind: 'element', id: element.id }, element.boundingBox)
          }
          className="inline-flex items-center gap-1 text-accent hover:text-accent-hover font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Focus className="w-3 h-3" aria-hidden="true" />
          <span>Locate</span>
        </button>
      </div>
    </article>
  );
};

export interface AnatomyPatternsSectionProps {
  patterns: AnatomyPatternsSection;
  allElements: readonly VisualElement[];
  regions: readonly VisualRegion[];
  elementAssets: Record<string, ElementVisualAssets>;
  image: UploadedImage;
  samplingAssets: boolean;
  onExpandCrop: (target: CropLightboxTarget) => void;
  onInspectInWorkspace: (
    selection: InvestigationSelection,
    targetBox?: NormalizedBoundingBox | null
  ) => void;
  onRunVisualAnalysis?: () => void;
  canRunVisualAi: boolean;
}

export const AnatomyPatternsSectionView: React.FC<AnatomyPatternsSectionProps> = ({
  patterns,
  allElements,
  regions,
  elementAssets,
  image,
  samplingAssets,
  onExpandCrop,
  onInspectInWorkspace,
  onRunVisualAnalysis,
  canRunVisualAi
}) => {
  const regionNameById = new Map(regions.map((r) => [r.id, r.name]));
  const elementById = new Map(allElements.map((e) => [e.id, e]));

  const subgroups: Array<{ title: string; items: VisualElement[] }> = [
    { title: 'Geometric Motifs', items: patterns.motifs },
    { title: 'Backgrounds & Textures', items: patterns.textures },
    { title: 'Icons & Symbols', items: patterns.icons },
    { title: 'Decorative Details', items: patterns.decorative }
  ].filter((g) => g.items.length > 0);

  return (
    <section
      id="anatomy-patterns"
      aria-label="Patterns and Motifs"
      className="bg-surface border border-border rounded-xl p-5 sm:p-7 space-y-6 scroll-mt-24"
    >
      <BoardSectionHeader
        index="04"
        title="Patterns & Motifs"
        subtitle="Real screenshot crops of recurring visual relationships, geometric forms, background textures, icons, and decorative identity markers."
        provenanceLabel="Screenshot Crops + AI-Inferred"
        provenanceKind="ai-inferred"
        rightSlot={
          patterns.available ? (
            <span className="font-mono text-[11px] text-muted tabular-nums">
              {patterns.patterns.length} pattern{patterns.patterns.length === 1 ? '' : 's'} ·{' '}
              {patterns.totalVisualElements} motif/surface specimen
              {patterns.totalVisualElements === 1 ? '' : 's'}
            </span>
          ) : null
        }
      />

      {!patterns.available ? (
        <SectionUnavailableNotice
          title="No patterns, motifs, or surface specimens detected"
          description={
            canRunVisualAi
              ? 'Run AI Visual Interpretation to detect geometric motifs, surface textures, symbols, and verified recurring patterns directly from the screenshot.'
              : 'No distinct geometric motifs, decorative details, or recurring pattern relationships were verified on this capture.'
          }
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
        <div className="space-y-7">
          {/* Verified Recurring Multi-Occurrence Patterns (Side-by-side comparison gallery) */}
          {patterns.patterns.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-xs font-semibold text-ink">
                  Verified Recurring Relationships
                </h3>
                <span className="text-[11px] text-muted">
                  Multi-occurrence screenshot evidence (≥ 2 distinct locations)
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {patterns.patterns.map((pattern) => {
                  const crops: Array<{ url: string; label: string }> = [];
                  let firstBox: NormalizedBoundingBox | null = null;
                  const collectedSwatches: Array<{ hex: string; percentage: number }> = [];

                  for (const elId of pattern.elementIds) {
                    const el = elementById.get(elId);
                    if (!el) continue;
                    if (!firstBox) firstBox = el.boundingBox;
                    const a = elementAssets[elId];
                    if (a?.measuredColors && collectedSwatches.length === 0) {
                      collectedSwatches.push(
                        ...a.measuredColors.map((c) => ({
                          hex: c.hex,
                          percentage: c.percentage
                        }))
                      );
                    }
                    const urls = a?.occurrenceCropUrls ?? [];
                    for (let i = 0; i < urls.length && crops.length < 3; i++) {
                      crops.push({ url: urls[i], label: `${el.name} #${i + 1}` });
                    }
                  }

                  const regionNames = pattern.regionIds
                    .map((id) => regionNameById.get(id))
                    .filter((n): n is string => Boolean(n));

                  return (
                    <article
                      key={pattern.id}
                      data-anatomy-pattern={pattern.id}
                      className="rounded-xl border border-border bg-canvas/85 overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        {/* Side-by-side real cropped occurrences */}
                        <div className="relative border-b border-border bg-[#060A0C]">
                          <div
                            className="grid gap-px bg-border min-h-[132px]"
                            style={{
                              gridTemplateColumns: `repeat(${Math.max(1, crops.length)}, minmax(0, 1fr))`
                            }}
                          >
                            {crops.length > 0 ? (
                              crops.map((c, idx) => (
                                <div
                                  key={`${pattern.id}-c-${idx}`}
                                  className="bg-[#070B0D] p-3 flex flex-col items-center justify-center gap-1.5"
                                  style={{
                                    backgroundImage:
                                      'radial-gradient(rgba(145, 162, 165, 0.1) 1px, transparent 1px)',
                                    backgroundSize: '14px 14px'
                                  }}
                                >
                                  <img
                                    src={c.url}
                                    alt={`Occurrence ${idx + 1} of ${pattern.name}`}
                                    className="max-h-20 max-w-full object-contain rounded-sm shadow-[0_6px_16px_rgba(0,0,0,0.45)]"
                                  />
                                  <span className="font-mono text-[10px] text-faint tabular-nums">
                                    Instance #{idx + 1}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="bg-[#070B0D] p-5 flex items-center justify-center text-xs text-faint">
                                {samplingAssets
                                  ? 'Cropping repeated occurrences…'
                                  : `${pattern.occurrenceCount} verified screenshot locations`}
                              </div>
                            )}
                          </div>

                          {crops.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                onExpandCrop({
                                  title: pattern.name,
                                  categoryLabel: PATTERN_TYPE_LABELS[pattern.patternType],
                                  cropUrl: crops[0].url,
                                  occurrenceCropUrls: crops.map((c) => c.url),
                                  description: pattern.description,
                                  provenance: 'ai-inferred',
                                  confidence: pattern.confidence,
                                  evidence: pattern.evidence,
                                  parentRegionId: pattern.regionIds[0] ?? null,
                                  parentRegionName: regionNames[0] ?? null,
                                  measuredColors: collectedSwatches,
                                  selection: { kind: 'pattern', id: pattern.id },
                                  targetBox: firstBox,
                                  pixelDimensions: null
                                })
                              }
                              aria-label={`Expand crop comparison for ${pattern.name}`}
                              title="Expand occurrence crops"
                              className="absolute top-2.5 right-2.5 w-7 h-7 rounded-md border border-border bg-[#070B0D]/85 text-muted hover:text-ink hover:border-accent-border flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          )}
                        </div>

                        <div className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <h4 className="text-sm font-semibold text-ink">{pattern.name}</h4>
                            <span
                              className={`text-[11px] font-medium capitalize shrink-0 ${CONFIDENCE_TEXT_STYLE[pattern.confidence]}`}
                            >
                              {pattern.confidence}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
                            <span className="inline-flex items-center gap-1 text-[#F59E0B] font-medium">
                              <Repeat className="w-3 h-3" aria-hidden="true" />
                              <span>{PATTERN_TYPE_LABELS[pattern.patternType]}</span>
                            </span>
                            <span className="text-border-strong" aria-hidden="true">
                              ·
                            </span>
                            <span className="font-mono text-ink/90 tabular-nums">
                              {pattern.occurrenceCount}× verified
                            </span>
                          </div>
                          <p className="text-xs text-muted leading-relaxed">
                            {pattern.description}
                          </p>
                        </div>
                      </div>

                      <div className="px-4 py-2.5 border-t border-border bg-surface/60 flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-muted truncate">
                          {regionNames.length > 0
                            ? `Regions: ${regionNames.join(', ')}`
                            : `${pattern.elementIds.length} linked element${pattern.elementIds.length === 1 ? '' : 's'}`}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onInspectInWorkspace(
                              { kind: 'pattern', id: pattern.id },
                              firstBox
                            )
                          }
                          className="inline-flex items-center gap-1 text-accent hover:text-accent-hover font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <Focus className="w-3 h-3" aria-hidden="true" />
                          <span>Inspect Pattern</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {/* Individual & Recurring Motif / Texture / Icon / Decorative Specimens */}
          {subgroups.map((group) => (
            <div key={group.title} className="space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-xs font-semibold text-muted">{group.title}</h3>
                <span className="font-mono text-[11px] text-faint tabular-nums">
                  {group.items.length} specimen{group.items.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.items.map((el) => (
                  <ElementSpecimenCard
                    key={el.id}
                    element={el}
                    assets={elementAssets[el.id]}
                    image={image}
                    samplingAssets={samplingAssets}
                    onExpandCrop={onExpandCrop}
                    onInspectInWorkspace={onInspectInWorkspace}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export interface AnatomyComponentsSectionProps {
  components: AnatomyComponentsSection;
  elementAssets: Record<string, ElementVisualAssets>;
  image: UploadedImage;
  samplingAssets: boolean;
  onExpandCrop: (target: CropLightboxTarget) => void;
  onInspectInWorkspace: (
    selection: InvestigationSelection,
    targetBox?: NormalizedBoundingBox | null
  ) => void;
  onRunVisualAnalysis?: () => void;
  canRunVisualAi: boolean;
}

export const AnatomyComponentsSectionView: React.FC<AnatomyComponentsSectionProps> = ({
  components,
  elementAssets,
  image,
  samplingAssets,
  onExpandCrop,
  onInspectInWorkspace,
  onRunVisualAnalysis,
  canRunVisualAi
}) => {
  return (
    <section
      id="anatomy-components"
      aria-label="Components and Shapes"
      className="bg-surface border border-border rounded-xl p-5 sm:p-7 space-y-6 scroll-mt-24"
    >
      <BoardSectionHeader
        index="05"
        title="Components & Shapes"
        subtitle="Cropped UI component specimens, shared component languages, inferred visual treatments, and corner radius geometry."
        provenanceLabel="M9 Crops + M5/M6 Analysis"
        provenanceKind="ai-inferred"
      />

      {!components.available ? (
        <SectionUnavailableNotice
          title="No component specimens available yet"
          description="Run AI Visual Interpretation to inspect buttons, cards, navigation containers, borders, and corner radius scales."
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
          {/* 1. Cropped M9 Component Style Specimens */}
          {components.croppedComponents.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-xs font-semibold text-ink">
                  Localized Component Specimens
                </h3>
                <span className="font-mono text-[11px] text-muted tabular-nums">
                  {components.croppedComponents.length} cropped component
                  {components.croppedComponents.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {components.croppedComponents.map((el) => (
                  <ElementSpecimenCard
                    key={el.id}
                    element={el}
                    assets={elementAssets[el.id]}
                    image={image}
                    samplingAssets={samplingAssets}
                    onExpandCrop={onExpandCrop}
                    onInspectInWorkspace={onInspectInWorkspace}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 2. M5 Component Inventory (Honest: no invented navigation links for unlocalized items) */}
          {components.inferredComponents.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-xs font-semibold text-muted">
                  Observed Interface Component Styles
                </h3>
                <span className="text-[11px] text-faint">
                  AI-inferred treatment &amp; emphasis
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {components.inferredComponents.map((comp, idx) => (
                  <div
                    key={`${comp.name}-${idx}`}
                    className="rounded-xl border border-border bg-canvas/70 p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-semibold text-ink leading-snug">
                        {comp.name}
                      </h4>
                      <span className="text-[11px] font-mono text-faint capitalize shrink-0">
                        {comp.category}
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">{comp.visualTreatment}</p>
                    <div className="pt-1.5 border-t border-border/70 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <span className="font-mono text-ink/90">
                        Radius: {comp.borderRadius}
                      </span>
                      <ProvenanceInline
                        provenance="ai-inferred"
                        confidence={comp.confidence}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Corner Treatments & Border Tokens */}
          {(components.borderRadii.length > 0 || components.borderTokens.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2 border-t border-border">
              {components.borderRadii.length > 0 && (
                <div className="lg:col-span-7 space-y-3">
                  <h3 className="text-xs font-semibold text-muted">
                    Corner Radius Treatments
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {components.borderRadii.map((rad, idx) => (
                      <div
                        key={`${rad.label}-${idx}`}
                        className="rounded-xl border border-border bg-canvas/75 p-3.5 space-y-2.5"
                      >
                        <div
                          className="w-10 h-10 border-[1.5px] border-accent/80 bg-accent-soft/40"
                          style={{
                            borderRadius:
                              /^\d+(\.\d+)?(px|rem|%)$/.test(rad.value.trim()) ||
                              rad.value.toLowerCase().includes('full')
                                ? rad.value.toLowerCase().includes('full')
                                  ? '9999px'
                                  : rad.value.trim()
                                : '8px'
                          }}
                          aria-hidden="true"
                        />
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-ink">{rad.label}</p>
                          <p className="font-mono text-[11px] text-accent">{rad.value}</p>
                          <p className="text-[11px] text-muted line-clamp-2">{rad.usage}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {components.borderTokens.length > 0 && (
                <div
                  className={
                    components.borderRadii.length > 0
                      ? 'lg:col-span-5 space-y-3'
                      : 'lg:col-span-12 space-y-3'
                  }
                >
                  <h3 className="text-xs font-semibold text-muted">Normalised Border Tokens</h3>
                  <div className="divide-y divide-border rounded-xl border border-border bg-canvas/75">
                    {components.borderTokens.map((tok) => (
                      <div
                        key={tok.cssVariable}
                        className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-mono text-accent truncate">{tok.cssVariable}</p>
                          <p className="text-[11px] text-muted truncate">{tok.value}</p>
                        </div>
                        <ProvenanceInline
                          provenance={tok.provenance}
                          confidence={tok.confidence}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Shared component language patterns quick jump */}
          {components.sharedComponentPatterns.length > 0 && (
            <div className="pt-2 border-t border-border flex flex-wrap items-center gap-3 text-xs">
              <span className="text-muted">Shared component language:</span>
              {components.sharedComponentPatterns.map((pat) => (
                <button
                  key={pat.id}
                  type="button"
                  onClick={() => onInspectInWorkspace({ kind: 'pattern', id: pat.id }, null)}
                  className="inline-flex items-center gap-1 text-accent hover:text-accent-hover font-medium transition-colors cursor-pointer"
                >
                  <span>
                    {pat.name} ({pat.occurrenceCount}×)
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
