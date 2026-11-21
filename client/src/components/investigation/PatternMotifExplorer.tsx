import React, { useMemo } from 'react';
import { Crosshair, Focus, Layers, Repeat } from 'lucide-react';
import {
  ELEMENT_CATEGORY_LABELS,
  ELEMENT_CATEGORY_ORDER,
  ELEMENT_CATEGORY_SHORT_LABELS,
  PATTERN_TYPE_LABELS,
  type ElementVisualAssets,
  type ExplorerTabId,
  type InvestigationSelection,
  type NormalizedBoundingBox,
  type PatternRelationship,
  type VisualElement,
  type VisualRegion
} from '../../types/investigation';

export interface PatternMotifExplorerProps {
  elements: readonly VisualElement[];
  patterns: readonly PatternRelationship[];
  regions: readonly VisualRegion[];
  elementAssetsMap: Record<string, ElementVisualAssets>;
  samplingAssets: boolean;
  activeTab: ExplorerTabId;
  selection: InvestigationSelection;
  hoveredElementId: string | null;
  onSelectTab: (tab: ExplorerTabId) => void;
  onSelectElement: (elementId: string) => void;
  onSelectPattern: (patternId: string) => void;
  onSelectRegion: (regionId: string) => void;
  onHoverElement: (elementId: string | null) => void;
  onLocateOnCanvas: (box: NormalizedBoundingBox, label: string, selection: InvestigationSelection) => void;
}

const CONFIDENCE_TEXT_STYLE = {
  high: 'text-[#34D399]',
  medium: 'text-[#FBBF24]',
  low: 'text-[#F87171]'
} as const;

export const PatternMotifExplorer: React.FC<PatternMotifExplorerProps> = ({
  elements,
  patterns,
  regions,
  elementAssetsMap,
  samplingAssets,
  activeTab,
  selection,
  hoveredElementId,
  onSelectTab,
  onSelectElement,
  onSelectPattern,
  onSelectRegion,
  onHoverElement,
  onLocateOnCanvas
}) => {
  const regionNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of regions) map.set(r.id, r.name);
    return map;
  }, [regions]);

  const elementById = useMemo(() => {
    const map = new Map<string, VisualElement>();
    for (const e of elements) map.set(e.id, e);
    return map;
  }, [elements]);

  const categoryCounts = useMemo(() => {
    const counts: Record<ExplorerTabId, number> = {
      all: elements.length + patterns.length,
      patterns: patterns.length,
      'geometric-motif': 0,
      'background-texture': 0,
      'icon-symbol': 0,
      'component-style': 0,
      'decorative-detail': 0
    };
    for (const el of elements) {
      counts[el.category] += 1;
    }
    return counts;
  }, [elements, patterns]);

  const visibleElements = useMemo(() => {
    if (activeTab === 'patterns') return [];
    if (activeTab === 'all') return elements;
    return elements.filter((e) => e.category === activeTab);
  }, [elements, activeTab]);

  const showPatternsSection =
    (activeTab === 'all' && patterns.length > 0) || activeTab === 'patterns';

  const tabs: Array<{ id: ExplorerTabId; label: string; count: number }> = [
    { id: 'all', label: 'All Findings', count: categoryCounts.all },
    { id: 'patterns', label: 'Patterns', count: categoryCounts.patterns },
    ...ELEMENT_CATEGORY_ORDER.map((cat) => ({
      id: cat as ExplorerTabId,
      label: ELEMENT_CATEGORY_LABELS[cat],
      count: categoryCounts[cat]
    }))
  ];

  return (
    <section
      aria-label="Patterns, Motifs and Components Explorer"
      className="bg-surface border border-border rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-ink tracking-[-0.015em]">
            Patterns, Motifs &amp; Component Styles
          </h2>
          <p className="text-xs text-muted leading-relaxed">
            What visual patterns and design elements give this website its identity? Select any
            card to highlight its location on the screenshot and inspect visual details.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted font-mono tabular-nums shrink-0">
          <span>{patterns.length} shared pattern{patterns.length === 1 ? '' : 's'}</span>
          <span className="text-border-strong font-sans" aria-hidden="true">
            ·
          </span>
          <span>{elements.length} visual element{elements.length === 1 ? '' : 's'}</span>
        </div>
      </div>

      {/* Category Filter Bar */}
      <div
        role="tablist"
        aria-label="Filter visual identity elements by category"
        className="px-5 py-3 border-b border-border bg-canvas/55 flex items-center gap-1.5 overflow-x-auto"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelectTab(tab.id)}
              className={[
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0',
                isActive
                  ? 'bg-accent text-[#051315] border-accent font-semibold'
                  : 'bg-surface text-muted border-border hover:text-ink hover:border-border-strong'
              ].join(' ')}
            >
              <span>{tab.label}</span>
              <span
                className={[
                  'font-mono text-[11px] tabular-nums',
                  isActive ? 'text-[#051315]/80' : 'text-faint'
                ].join(' ')}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="p-5 space-y-6">
        {/* 1. Shared Recurring Patterns (Visual Comparison Cards) */}
        {showPatternsSection && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <h3 className="text-sm font-semibold text-ink">
                  Verified Recurring Patterns
                </h3>
                <p className="text-xs text-muted">
                  Grouped only where 2 or more distinct visual occurrences are present on the
                  screenshot.
                </p>
              </div>
            </div>

            {patterns.length === 0 ? (
              <div className="rounded-xl border border-border bg-canvas/60 px-5 py-7 text-center space-y-1.5">
                <Repeat className="w-5 h-5 text-faint mx-auto" aria-hidden="true" />
                <p className="text-sm font-medium text-ink">
                  No recurring multi-location patterns verified
                </p>
                <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
                  DesignDNA only groups elements into a shared pattern when repetition is visibly
                  evidenced across 2 or more distinct screenshot locations. Single-occurrence items
                  remain listed under their respective categories.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {patterns.map((pattern) => {
                  const isSelected =
                    selection?.kind === 'pattern' && selection.id === pattern.id;

                  // Collect up to 3 real screenshot crops for visual comparison
                  const cropPreviews: Array<{ url: string; label: string }> = [];
                  let firstBox: NormalizedBoundingBox | null = null;
                  for (const elId of pattern.elementIds) {
                    const el = elementById.get(elId);
                    if (!el) continue;
                    if (!firstBox) firstBox = el.boundingBox;
                    const assets = elementAssetsMap[elId];
                    const urls = assets?.occurrenceCropUrls ?? [];
                    for (let i = 0; i < urls.length && cropPreviews.length < 3; i++) {
                      cropPreviews.push({ url: urls[i], label: `${el.name} #${i + 1}` });
                    }
                  }

                  const regionNames = pattern.regionIds
                    .map((id) => regionNameById.get(id))
                    .filter((name): name is string => Boolean(name));

                  return (
                    <article
                      key={pattern.id}
                      data-pattern-card={pattern.id}
                      className={[
                        'rounded-xl border bg-canvas/80 overflow-hidden transition-all duration-150 flex flex-col',
                        isSelected
                          ? 'border-accent shadow-[0_0_0_1px_rgba(22,214,197,0.45),0_12px_28px_rgba(22,214,197,0.1)]'
                          : 'border-border hover:border-border-strong'
                      ].join(' ')}
                    >
                      {/* Side-by-side real cropped visual comparison strip */}
                      <button
                        type="button"
                        onClick={() => onSelectPattern(pattern.id)}
                        className="w-full text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
                      >
                        <div
                          className="grid gap-px bg-border border-b border-border min-h-[104px]"
                          style={{
                            gridTemplateColumns: `repeat(${Math.max(1, cropPreviews.length)}, minmax(0, 1fr))`
                          }}
                        >
                          {cropPreviews.length > 0 ? (
                            cropPreviews.map((crop, idx) => (
                              <div
                                key={`${pattern.id}-crop-${idx}`}
                                className="bg-[#070B0D] p-3 flex flex-col items-center justify-center gap-1.5"
                                style={{
                                  backgroundImage:
                                    'radial-gradient(rgba(145, 162, 165, 0.1) 1px, transparent 1px)',
                                  backgroundSize: '14px 14px'
                                }}
                              >
                                <img
                                  src={crop.url}
                                  alt={`Cropped screenshot occurrence ${idx + 1} of ${pattern.name}`}
                                  className="max-h-16 max-w-full object-contain rounded-sm"
                                />
                                <span className="text-[10px] font-mono text-faint tabular-nums">
                                  #{idx + 1}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="bg-[#070B0D] p-4 flex items-center justify-center text-xs text-faint">
                              {samplingAssets
                                ? 'Preparing visual comparison crops…'
                                : `${pattern.occurrenceCount} linked screenshot locations`}
                            </div>
                          )}
                        </div>

                        <div className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <h4 className="text-sm font-semibold text-ink leading-snug">
                              {pattern.name}
                            </h4>
                            <span
                              className={`text-[11px] font-medium capitalize shrink-0 ${CONFIDENCE_TEXT_STYLE[pattern.confidence]}`}
                            >
                              {pattern.confidence}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
                            <span className="text-[#F59E0B]">
                              {PATTERN_TYPE_LABELS[pattern.patternType]}
                            </span>
                            <span className="text-border-strong" aria-hidden="true">
                              ·
                            </span>
                            <span className="font-mono tabular-nums text-ink/90">
                              Repeated {pattern.occurrenceCount}×
                            </span>
                          </div>

                          <p className="text-xs text-muted leading-relaxed line-clamp-2">
                            {pattern.description}
                          </p>
                        </div>
                      </button>

                      {/* Footer Actions */}
                      <div className="px-4 py-2.5 border-t border-border bg-surface/60 flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-muted truncate">
                          {regionNames.length > 0
                            ? `Regions: ${regionNames.join(', ')}`
                            : `${pattern.elementIds.length} linked element${pattern.elementIds.length === 1 ? '' : 's'}`}
                        </span>
                        {firstBox && (
                          <button
                            type="button"
                            onClick={() =>
                              onLocateOnCanvas(firstBox!, pattern.name, {
                                kind: 'pattern',
                                id: pattern.id
                              })
                            }
                            className="inline-flex items-center gap-1 text-accent hover:text-accent-hover font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <Focus className="w-3 h-3" aria-hidden="true" />
                            <span>Locate</span>
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 2. Visual Elements Grid (Geometric Motifs, Backgrounds, Icons, Components, Decorative) */}
        {activeTab !== 'patterns' && (
          <div className="space-y-3">
            {activeTab === 'all' && patterns.length > 0 && (
              <div className="flex items-center justify-between gap-2 pt-1">
                <h3 className="text-sm font-semibold text-ink">Detected Visual Elements</h3>
                <span className="text-xs text-muted font-mono tabular-nums">
                  {visibleElements.length} item{visibleElements.length === 1 ? '' : 's'}
                </span>
              </div>
            )}

            {visibleElements.length === 0 ? (
              <div className="rounded-xl border border-border bg-canvas/60 px-5 py-8 text-center space-y-1.5">
                <Crosshair className="w-5 h-5 text-faint mx-auto" aria-hidden="true" />
                <p className="text-sm font-medium text-ink">
                  {elements.length === 0
                    ? 'No distinctive visual elements verified on this capture'
                    : `No ${ELEMENT_CATEGORY_LABELS[activeTab as keyof typeof ELEMENT_CATEGORY_LABELS]} detected`}
                </p>
                <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
                  {elements.length === 0
                    ? 'DesignDNA only displays elements that are genuinely visible and pass normalized coordinate validation.'
                    : 'This category was not prominently observed in the uploaded screenshot. Explore other tabs above to inspect detected elements.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {visibleElements.map((element) => {
                  const isSelected =
                    selection?.kind === 'element' && selection.id === element.id;
                  const isHovered = hoveredElementId === element.id;
                  const assets = elementAssetsMap[element.id];
                  const cropUrl = assets?.primaryCropUrl ?? null;
                  const swatches = assets?.measuredColors ?? [];
                  const isComponent = element.category === 'component-style';
                  const categoryColor = isComponent ? 'text-[#38BDF8]' : 'text-[#F59E0B]';

                  return (
                    <article
                      key={element.id}
                      data-element-card={element.id}
                      data-element-category={element.category}
                      onMouseEnter={() => onHoverElement(element.id)}
                      onMouseLeave={() => onHoverElement(null)}
                      className={[
                        'group rounded-xl border bg-canvas/80 overflow-hidden transition-all duration-150 flex flex-col justify-between',
                        isSelected
                          ? 'border-accent shadow-[0_0_0_1px_rgba(22,214,197,0.45),0_12px_28px_rgba(22,214,197,0.1)]'
                          : isHovered
                            ? 'border-border-strong bg-elevated/40'
                            : 'border-border hover:border-border-strong'
                      ].join(' ')}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectElement(element.id)}
                        aria-pressed={isSelected}
                        className="w-full text-left flex-1 flex flex-col cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
                      >
                        {/* Real Cropped Screenshot Preview */}
                        <div
                          className="relative h-32 w-full border-b border-border bg-[#070B0D] p-3 flex items-center justify-center overflow-hidden"
                          style={{
                            backgroundImage:
                              'radial-gradient(rgba(145, 162, 165, 0.11) 1px, transparent 1px)',
                            backgroundSize: '14px 14px'
                          }}
                        >
                          {cropUrl ? (
                            <img
                              src={cropUrl}
                              alt={`Cropped screenshot preview of ${element.name}`}
                              className="max-h-full max-w-full object-contain rounded-sm shadow-[0_6px_16px_rgba(0,0,0,0.45)] transition-transform duration-200 group-hover:scale-[1.03]"
                            />
                          ) : (
                            <div className="text-center space-y-1">
                              <span className="block font-mono text-[11px] text-faint tabular-nums">
                                ({Math.round(element.boundingBox.x * 100)}%,{' '}
                                {Math.round(element.boundingBox.y * 100)}%)
                              </span>
                              <span className="block text-[11px] text-muted">
                                {samplingAssets ? 'Cropping preview…' : 'Coordinate reference'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Card Copy & Quiet Unboxed Metadata */}
                        <div className="p-3.5 space-y-2 flex-1 flex flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <h4
                              className={[
                                'text-xs font-semibold leading-snug line-clamp-1',
                                isSelected ? 'text-accent' : 'text-ink'
                              ].join(' ')}
                              title={element.name}
                            >
                              {element.name}
                            </h4>
                            <span
                              className={`text-[11px] font-medium capitalize shrink-0 ${CONFIDENCE_TEXT_STYLE[element.confidence]}`}
                            >
                              {element.confidence}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted">
                            <span className={categoryColor}>
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
                          </div>

                          <p className="text-xs text-muted leading-relaxed line-clamp-2 flex-1">
                            {element.description}
                          </p>

                          {/* Inline measured colour strip (no pills) */}
                          {swatches.length > 0 && (
                            <div className="flex items-center gap-1.5 pt-1">
                              {swatches.slice(0, 4).map((sw) => (
                                <span
                                  key={sw.hex}
                                  title={`${sw.hex} (${sw.percentage.toFixed(1)}%)`}
                                  className="w-3.5 h-3.5 rounded-[3px] border border-border-strong shrink-0"
                                  style={{ backgroundColor: sw.hex }}
                                />
                              ))}
                              <span className="text-[10px] font-mono text-faint truncate">
                                {swatches[0].hex}
                              </span>
                            </div>
                          )}
                        </div>
                      </button>

                      {/* Card Footer: Parent Region Reference + Locate on Canvas */}
                      <div className="px-3.5 py-2 border-t border-border bg-surface/60 flex items-center justify-between gap-2 text-[11px]">
                        {element.parentRegionId && element.parentRegionName ? (
                          <button
                            type="button"
                            onClick={() => onSelectRegion(element.parentRegionId!)}
                            title={`Inspect parent region ${element.parentRegionName}`}
                            className="inline-flex items-center gap-1 text-muted hover:text-ink transition-colors truncate cursor-pointer"
                          >
                            <Layers className="w-3 h-3 text-accent shrink-0" aria-hidden="true" />
                            <span className="truncate">{element.parentRegionName}</span>
                          </button>
                        ) : (
                          <span className="font-mono text-faint tabular-nums truncate">
                            @{Math.round(element.boundingBox.x * 100)}%,
                            {Math.round(element.boundingBox.y * 100)}%
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            onLocateOnCanvas(element.boundingBox, element.name, {
                              kind: 'element',
                              id: element.id
                            })
                          }
                          aria-label={`Locate ${element.name} on screenshot`}
                          className="inline-flex items-center gap-1 text-accent hover:text-accent-hover font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <Focus className="w-3 h-3" aria-hidden="true" />
                          <span>Locate</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
