import React, { useMemo } from 'react';
import { Crosshair, Focus, Layers, Repeat2 } from 'lucide-react';
import { normalizedBoxToPixels } from '../../services/investigation/regionSchema';
import type { VisualRegion } from '../../types/investigation';
import {
  PATTERN_CATEGORY_LABELS,
  PATTERN_EXPLORER_TAB_ORDER,
  VISUAL_ELEMENT_CATEGORY_SHORT_LABELS,
  type PatternExplorerCategory,
  type PatternVisualAsset,
  type VisualPatternElement
} from '../../types/patterns';
import type { UploadedImage } from '../../types/upload';

export interface PatternExplorerProps {
  image: UploadedImage;
  patterns: readonly VisualPatternElement[];
  regions: readonly VisualRegion[];
  patternAssets: Record<string, PatternVisualAsset>;
  activeCategory: PatternExplorerCategory;
  selectedPatternId: string | null;
  hoveredPatternId: string | null;
  rejectedCount: number;
  loadingAssets: boolean;
  onSelectCategory: (category: PatternExplorerCategory) => void;
  onSelectPattern: (patternId: string | null) => void;
  onHoverPattern: (patternId: string | null) => void;
  onFocusPattern: (pattern: VisualPatternElement, occurrenceIndex?: number) => void;
  onSelectRegion: (regionId: string) => void;
}

const CONFIDENCE_TEXT_STYLE = {
  high: 'text-[#34D399]',
  medium: 'text-[#FBBF24]',
  low: 'text-[#F87171]'
} as const;

export const PatternExplorer: React.FC<PatternExplorerProps> = ({
  image,
  patterns,
  regions,
  patternAssets,
  activeCategory,
  selectedPatternId,
  hoveredPatternId,
  rejectedCount,
  loadingAssets,
  onSelectCategory,
  onSelectPattern,
  onHoverPattern,
  onFocusPattern,
  onSelectRegion
}) => {
  const regionNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of regions) {
      map.set(r.id, r.name);
    }
    return map;
  }, [regions]);

  const categoryCounts = useMemo(() => {
    const counts: Record<PatternExplorerCategory, number> = {
      all: patterns.length,
      'recurring-patterns': 0,
      'geometric-motif': 0,
      'background-texture': 0,
      'icon-symbol': 0,
      'component-style': 0,
      'decorative-detail': 0
    };
    for (const item of patterns) {
      if (item.recurrenceType === 'recurring-pattern') {
        counts['recurring-patterns'] += 1;
      }
      counts[item.category] += 1;
    }
    return counts;
  }, [patterns]);

  const filteredPatterns = useMemo(() => {
    if (activeCategory === 'all') return patterns;
    if (activeCategory === 'recurring-patterns') {
      return patterns.filter((p) => p.recurrenceType === 'recurring-pattern');
    }
    return patterns.filter((p) => p.category === activeCategory);
  }, [patterns, activeCategory]);

  const recurringCount = categoryCounts['recurring-patterns'];
  const individualCount = patterns.length - recurringCount;

  return (
    <section
      data-pattern-explorer="true"
      aria-label="Pattern, motif, and component explorer"
      className="bg-surface border border-border rounded-xl overflow-hidden"
    >
      {/* Header & Summary Strip */}
      <div className="px-5 py-4 border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h2 className="text-base font-semibold text-ink tracking-[-0.015em]">
              Patterns, Motifs &amp; Components
            </h2>
            <span className="text-xs font-mono text-muted tabular-nums">
              {patterns.length} detected
            </span>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Visual language inside the screenshot — click any card to highlight its location on the
            canvas and inspect its traits, colour pixels, and region links.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-muted tabular-nums shrink-0">
          <span>
            <span className="text-accent font-semibold">{recurringCount}</span> recurring
          </span>
          <span className="text-border-strong font-sans" aria-hidden="true">
            ·
          </span>
          <span>
            <span className="text-ink font-semibold">{individualCount}</span> individual
          </span>
          {rejectedCount > 0 && (
            <>
              <span className="text-border-strong font-sans" aria-hidden="true">
                ·
              </span>
              <span className="text-faint">{rejectedCount} invalid filtered</span>
            </>
          )}
        </div>
      </div>

      {/* Category Filter Bar */}
      <div
        role="group"
        aria-label="Filter visual patterns by category"
        className="px-5 py-3 border-b border-border bg-canvas/50 flex flex-wrap items-center gap-1.5"
      >
        {PATTERN_EXPLORER_TAB_ORDER.map((category) => {
          const count = categoryCounts[category];
          const isActive = activeCategory === category;
          return (
            <button
              key={category}
              type="button"
              onClick={() => onSelectCategory(category)}
              aria-pressed={isActive}
              data-pattern-filter={category}
              className={[
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer',
                isActive
                  ? 'bg-accent text-[#051315] border-accent font-semibold'
                  : count > 0
                    ? 'bg-surface text-muted border-border hover:text-ink hover:border-border-strong'
                    : 'bg-surface/50 text-faint border-border/70 hover:text-muted'
              ].join(' ')}
            >
              <span>{PATTERN_CATEGORY_LABELS[category]}</span>
              <span
                className={[
                  'font-mono text-[11px] tabular-nums',
                  isActive ? 'text-[#051315]/80' : 'text-faint'
                ].join(' ')}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Cards Grid */}
      <div className="p-5">
        {filteredPatterns.length === 0 ? (
          <div className="py-10 px-4 text-center space-y-2">
            <Layers className="w-5 h-5 text-faint mx-auto" aria-hidden="true" />
            <p className="text-sm font-medium text-ink">
              {patterns.length === 0
                ? 'No distinct patterns or motifs were verified for this screenshot'
                : activeCategory === 'recurring-patterns'
                  ? 'No recurring visual patterns verified across multiple locations'
                  : `No ${PATTERN_CATEGORY_LABELS[activeCategory].toLowerCase()} detected`}
            </p>
            <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
              {patterns.length === 0
                ? 'DesignDNA only displays visual elements with grounded screenshot coordinates rather than fabricating placeholder motifs.'
                : activeCategory === 'recurring-patterns'
                  ? 'Elements appearing only once are strictly classified as individual elements. View "All Elements" or another category to inspect them.'
                  : 'Select "All Elements" to explore detected visual details in other categories.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPatterns.map((item) => {
              const isSelected = selectedPatternId === item.id;
              const isHovered = hoveredPatternId === item.id;
              const asset = patternAssets[item.id];
              const crops = asset?.occurrenceCrops ?? [];
              const primaryCrop = crops[0] ?? null;
              const extraCrops =
                item.recurrenceType === 'recurring-pattern'
                  ? crops.slice(1, 3).filter((c): c is string => Boolean(c))
                  : [];

              const primaryOcc = item.occurrences[0];
              const pixelBox = normalizedBoxToPixels(
                primaryOcc.boundingBox,
                image.width,
                image.height
              );
              const firstRegionId = item.associatedRegionIds[0] ?? null;
              const firstRegionName = firstRegionId
                ? regionNameMap.get(firstRegionId) ?? null
                : null;
              const isRecurring = item.recurrenceType === 'recurring-pattern';

              return (
                <article
                  key={item.id}
                  data-pattern-card="true"
                  data-pattern-id={item.id}
                  data-pattern-category={item.category}
                  data-pattern-recurrence={item.recurrenceType}
                  data-recurrence-type={item.recurrenceType}
                  data-occurrence-count={item.occurrenceCount}
                  onClick={() => onSelectPattern(item.id)}
                  onMouseEnter={() => onHoverPattern(item.id)}
                  onMouseLeave={() => onHoverPattern(null)}
                  className={[
                    'group rounded-xl border flex flex-col overflow-hidden transition-all duration-150 cursor-pointer',
                    isSelected
                      ? 'bg-elevated border-accent shadow-[0_0_0_1px_rgba(22,214,197,0.45),0_12px_28px_rgba(22,214,197,0.12)]'
                      : isHovered
                        ? 'bg-elevated/80 border-accent-border'
                        : 'bg-canvas/70 border-border hover:border-border-strong'
                  ].join(' ')}
                >
                  {/* Real Cropped Screenshot Preview Area */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPattern(item.id);
                    }}
                    aria-pressed={isSelected}
                    aria-label={`Inspect ${item.name}`}
                    className="relative w-full h-36 bg-[#05080A] border-b border-border flex items-center justify-center overflow-hidden p-2.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
                    style={{
                      backgroundImage:
                        'radial-gradient(rgba(145, 162, 165, 0.1) 1px, transparent 1px)',
                      backgroundSize: '14px 14px'
                    }}
                  >
                    {loadingAssets && !primaryCrop ? (
                      <span className="text-[11px] font-mono text-faint">Cropping preview…</span>
                    ) : primaryCrop ? (
                      extraCrops.length > 0 ? (
                        <div className="w-full h-full grid grid-cols-3 gap-1.5 items-center">
                          <div className="col-span-2 h-full rounded border border-border/80 bg-canvas/80 overflow-hidden flex items-center justify-center p-1">
                            <img
                              src={primaryCrop}
                              alt={`Screenshot crop of ${item.name}`}
                              className="max-w-full max-h-full object-contain rounded-[2px]"
                              draggable={false}
                            />
                          </div>
                          <div className="col-span-1 h-full flex flex-col gap-1.5">
                            {extraCrops.map((cropUrl, idx) => (
                              <div
                                key={idx}
                                className="flex-1 min-h-0 rounded border border-border/70 bg-canvas/80 overflow-hidden flex items-center justify-center p-0.5"
                              >
                                <img
                                  src={cropUrl}
                                  alt={`${item.name} repeated occurrence ${idx + 2}`}
                                  className="max-w-full max-h-full object-contain"
                                  draggable={false}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <img
                          src={primaryCrop}
                          alt={`Screenshot crop of ${item.name}`}
                          className="max-w-full max-h-full object-contain rounded border border-border/60 shadow-sm transition-transform duration-200 group-hover:scale-[1.03]"
                          draggable={false}
                        />
                      )
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-faint">
                        <Crosshair className="w-4 h-4" aria-hidden="true" />
                        <span className="text-[11px] font-mono tabular-nums">
                          {pixelBox.width} × {pixelBox.height}px
                        </span>
                      </div>
                    )}
                  </button>

                  {/* Card Content */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      {/* Quiet Unboxed Metadata Line */}
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted">
                        <span
                          className={
                            item.category === 'component-style'
                              ? 'text-[#38BDF8] font-medium'
                              : 'text-accent font-medium'
                          }
                        >
                          {VISUAL_ELEMENT_CATEGORY_SHORT_LABELS[item.category]}
                        </span>
                        <span className="text-border-strong" aria-hidden="true">
                          ·
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                          {isRecurring && (
                            <Repeat2 className="w-3 h-3 text-[#FBBF24]" aria-hidden="true" />
                          )}
                          <span className={isRecurring ? 'text-ink' : 'text-faint'}>
                            {isRecurring ? `${item.occurrenceCount}× recurring` : 'Individual'}
                          </span>
                        </span>
                      </div>

                      {/* Title */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPattern(item.id);
                        }}
                        className="block w-full text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-accent rounded"
                      >
                        <h3
                          className={[
                            'text-sm font-semibold leading-snug truncate transition-colors',
                            isSelected ? 'text-accent' : 'text-ink group-hover:text-accent'
                          ].join(' ')}
                          title={item.name}
                        >
                          {item.name}
                        </h3>
                      </button>

                      {/* Short Description */}
                      <p className="text-xs text-muted leading-relaxed line-clamp-2">
                        {item.description}
                      </p>
                    </div>

                    {/* Footer: Confidence, Parent Region Reference & Focus Button */}
                    <div className="pt-2.5 border-t border-border/80 flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 min-w-0 truncate">
                        <span
                          className={`font-medium capitalize shrink-0 ${CONFIDENCE_TEXT_STYLE[item.confidence]}`}
                        >
                          {item.confidence}
                        </span>
                        <span className="text-border-strong shrink-0" aria-hidden="true">
                          ·
                        </span>
                        {firstRegionId && firstRegionName ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectRegion(firstRegionId);
                            }}
                            title={`Inspect parent region: ${firstRegionName}`}
                            className="truncate text-muted hover:text-accent transition-colors cursor-pointer"
                          >
                            {firstRegionName}
                            {item.associatedRegionIds.length > 1
                              ? ` +${item.associatedRegionIds.length - 1}`
                              : ''}
                          </button>
                        ) : (
                          <span className="font-mono text-faint tabular-nums truncate">
                            @{pixelBox.x},{pixelBox.y}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onFocusPattern(item, 0);
                        }}
                        aria-label={`Locate and zoom to ${item.name} on canvas`}
                        title="Locate & zoom on screenshot"
                        className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-surface text-muted hover:text-accent hover:border-accent-border transition-colors cursor-pointer"
                      >
                        <Focus className="w-3 h-3" aria-hidden="true" />
                        <span>Locate</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
