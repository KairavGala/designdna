import React from 'react';
import type {
  ComponentsMotifsComparisonModel,
  CropComparisonItem
} from '../../types/comparison';
import {
  ELEMENT_CATEGORY_SHORT_LABELS,
  PATTERN_TYPE_LABELS
} from '../../types/investigation';

export interface ComponentsMotifsCompareSectionProps {
  comparison: ComponentsMotifsComparisonModel;
}

const CropTile: React.FC<{
  slotLabel: 'Design A' | 'Design B';
  item: CropComparisonItem;
}> = ({ slotLabel, item }) => (
  <article
    data-compare-crop={slotLabel === 'Design A' ? 'design-a' : 'design-b'}
    className="rounded-lg border border-border bg-canvas/80 overflow-hidden flex flex-col"
  >
    <div className="h-28 bg-[#06090B] border-b border-border/80 flex items-center justify-center p-2 overflow-hidden">
      {item.cropUrl ? (
        <img
          src={item.cropUrl}
          alt={`${slotLabel} crop — ${item.name}`}
          className="max-h-full max-w-full object-contain rounded-sm"
        />
      ) : (
        <span className="text-[11px] text-faint">Crop unavailable</span>
      )}
    </div>

    <div className="p-3 space-y-1.5 flex-1 flex flex-col justify-between">
      <div className="space-y-1">
        <div className="flex items-baseline justify-between gap-2">
          <h4 className="text-xs font-semibold text-ink truncate" title={item.name}>
            {item.name}
          </h4>
          <span className="text-[10px] font-mono text-accent whitespace-nowrap shrink-0">
            {slotLabel}
          </span>
        </div>
        <p className="text-[11px] font-mono text-muted truncate">
          {ELEMENT_CATEGORY_SHORT_LABELS[item.category]} · {item.subcategory}
        </p>
        <p className="text-[11px] text-muted leading-relaxed line-clamp-2">{item.description}</p>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
        <div className="flex items-center gap-1">
          {item.measuredColors.slice(0, 3).map((c) => (
            <span
              key={c.hex}
              className="w-3 h-3 rounded-sm border border-white/15"
              style={{ backgroundColor: c.hex }}
              title={`${c.hex} (${c.percentage}%)`}
            />
          ))}
        </div>
        <span className="text-[10px] font-mono text-faint truncate">
          {item.parentRegionName ?? `${item.confidence} conf.`}
        </span>
      </div>
    </div>
  </article>
);

export const ComponentsMotifsCompareSection: React.FC<
  ComponentsMotifsCompareSectionProps
> = ({ comparison }) => {
  return (
    <section
      aria-labelledby="components-motifs-compare-heading"
      data-compare-section="components-motifs"
      className="rounded-xl border border-border bg-surface p-6 space-y-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 border-b border-border">
        <div className="space-y-0.5">
          <h2 id="components-motifs-compare-heading" className="text-base font-semibold text-ink">
            06. Components, Motifs & Visual Crops
          </h2>
          <p className="text-xs text-muted">
            Real PNG crops extracted directly from each screenshot. Pairs are shown only where category and element vocabulary reliably correspond.
          </p>
        </div>

        <span className="text-xs font-mono tabular-nums text-muted whitespace-nowrap">
          Design A: {comparison.totalElementsA} · Design B: {comparison.totalElementsB} ·{' '}
          {comparison.matchedElements.length} matched
        </span>
      </div>

      {comparison.unavailableReason && (
        <p className="text-xs text-[#FBBF24] bg-[#FBBF24]/5 border border-[#FBBF24]/25 rounded-lg px-3.5 py-2.5">
          {comparison.unavailableReason}
        </p>
      )}

      {comparison.availability === 'ready' && (
        <div className="space-y-6">
          {/* Matched Corresponding Elements */}
          <div className="space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-xs font-semibold text-ink">
                Corresponding Components & Motifs
              </h3>
              <span className="text-[11px] font-mono tabular-nums text-muted">
                {comparison.matchedElements.length} reliable correspondence
                {comparison.matchedElements.length === 1 ? '' : 's'}
              </span>
            </div>

            {comparison.matchedElements.length === 0 ? (
              <p className="text-xs text-muted bg-canvas/60 border border-border rounded-lg px-4 py-3">
                No reliable 1-to-1 component or motif correspondence was detected between Design A and Design B. Unique extracted crops are shown separately below without forcing artificial matches.
              </p>
            ) : (
              <div className="space-y-4">
                {comparison.matchedElements.map((pair) => (
                  <div
                    key={pair.id}
                    className="rounded-lg border border-border bg-canvas/40 p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-xs font-medium text-accent">{pair.matchBasis}</span>
                      <span className="text-[11px] font-mono text-faint">
                        Derived correspondence
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <CropTile slotLabel="Design A" item={pair.itemA} />
                      <CropTile slotLabel="Design B" item={pair.itemB} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Shared Pattern Languages */}
          {comparison.sharedPatterns.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-border">
              <h3 className="text-xs font-semibold text-ink">
                Shared Recurring Pattern Languages ({comparison.sharedPatterns.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {comparison.sharedPatterns.map((shared) => (
                  <div
                    key={shared.id}
                    className="rounded-lg border border-border bg-canvas/60 p-4 space-y-2"
                  >
                    <p className="text-xs font-medium text-accent">
                      {PATTERN_TYPE_LABELS[shared.patternType]}
                    </p>
                    <div className="space-y-1.5 text-xs">
                      <p className="text-ink">
                        <span className="font-mono text-[11px] text-faint mr-1.5">A:</span>
                        {shared.patternA.name} —{' '}
                        <span className="text-muted">{shared.patternA.description}</span>
                      </p>
                      <p className="text-ink">
                        <span className="font-mono text-[11px] text-faint mr-1.5">B:</span>
                        {shared.patternB.name} —{' '}
                        <span className="text-muted">{shared.patternB.description}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unique Elements Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-border">
            <div className="space-y-3 min-w-0">
              <h3 className="text-xs font-semibold text-ink">
                Unique to Design A ({comparison.uniqueToA.length})
              </h3>
              {comparison.uniqueToA.length === 0 ? (
                <p className="text-xs text-faint">No unmatched visual elements unique to Design A.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {comparison.uniqueToA.slice(0, 6).map((item) => (
                    <CropTile key={item.id} slotLabel="Design A" item={item} />
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 min-w-0">
              <h3 className="text-xs font-semibold text-ink">
                Unique to Design B ({comparison.uniqueToB.length})
              </h3>
              {comparison.uniqueToB.length === 0 ? (
                <p className="text-xs text-faint">No unmatched visual elements unique to Design B.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {comparison.uniqueToB.slice(0, 6).map((item) => (
                    <CropTile key={item.id} slotLabel="Design B" item={item} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
