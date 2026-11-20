import React from 'react';
import { Crosshair, Eye, EyeOff, Focus } from 'lucide-react';
import {
  REGION_CATEGORY_ORDER,
  REGION_CATEGORY_SHORT_LABELS,
  type VisualRegion,
  type VisualRegionCategory
} from '../../types/investigation';

export interface RegionListPanelProps {
  regions: readonly VisualRegion[];
  filteredRegions: readonly VisualRegion[];
  selectedRegionId: string | null;
  hoveredRegionId: string | null;
  activeCategory: 'all' | VisualRegionCategory;
  showAnnotations: boolean;
  rejectedCount: number;
  onSelectRegion: (regionId: string | null) => void;
  onHoverRegion: (regionId: string | null) => void;
  onSelectCategory: (category: 'all' | VisualRegionCategory) => void;
  onToggleAnnotations: () => void;
  onZoomToRegion: (region: VisualRegion) => void;
}

const CONFIDENCE_DOT_STYLE = {
  high: 'bg-[#34D399]',
  medium: 'bg-[#FBBF24]',
  low: 'bg-[#F87171]'
} as const;

export const RegionListPanel: React.FC<RegionListPanelProps> = ({
  regions,
  filteredRegions,
  selectedRegionId,
  hoveredRegionId,
  activeCategory,
  showAnnotations,
  rejectedCount,
  onSelectRegion,
  onHoverRegion,
  onSelectCategory,
  onToggleAnnotations,
  onZoomToRegion
}) => {
  // Only expose category filter buttons for categories actually present in the screenshot
  const presentCategories = REGION_CATEGORY_ORDER.filter((cat) =>
    regions.some((r) => r.category === cat)
  );

  return (
    <aside
      aria-label="Detected visual regions"
      className="bg-surface border border-border rounded-xl flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-border flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink tracking-[-0.015em]">
            Visual Regions
          </h2>
          <p className="text-[11px] font-mono text-muted tabular-nums mt-0.5">
            {filteredRegions.length} of {regions.length} shown
          </p>
        </div>

        <button
          type="button"
          onClick={onToggleAnnotations}
          aria-pressed={showAnnotations}
          title={showAnnotations ? 'Hide annotation overlays' : 'Show annotation overlays'}
          className={[
            'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer shrink-0',
            showAnnotations
              ? 'bg-accent-soft border-accent-border text-accent'
              : 'bg-elevated border-border text-muted hover:text-ink hover:border-border-strong'
          ].join(' ')}
        >
          {showAnnotations ? (
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          <span>{showAnnotations ? 'Overlays On' : 'Overlays Off'}</span>
        </button>
      </div>

      {/* Category Filters */}
      {presentCategories.length > 0 && (
        <div
          className="px-3.5 py-2.5 border-b border-border bg-canvas/50 flex flex-wrap gap-1.5"
          role="group"
          aria-label="Filter regions by category"
        >
          <button
            type="button"
            onClick={() => onSelectCategory('all')}
            aria-pressed={activeCategory === 'all'}
            className={[
              'px-2 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer',
              activeCategory === 'all'
                ? 'bg-accent text-[#051315] border-accent font-semibold'
                : 'bg-surface text-muted border-border hover:text-ink hover:border-border-strong'
            ].join(' ')}
          >
            All ({regions.length})
          </button>

          {presentCategories.map((category) => {
            const count = regions.filter((r) => r.category === category).length;
            const isActive = activeCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => onSelectCategory(category)}
                aria-pressed={isActive}
                className={[
                  'px-2 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer',
                  isActive
                    ? 'bg-accent text-[#051315] border-accent font-semibold'
                    : 'bg-surface text-muted border-border hover:text-ink hover:border-border-strong'
                ].join(' ')}
              >
                {REGION_CATEGORY_SHORT_LABELS[category]} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Region List */}
      <div className="divide-y divide-border overflow-y-auto max-h-[340px] xl:max-h-[560px]">
        {filteredRegions.length === 0 ? (
          <div className="px-4 py-8 text-center space-y-1.5">
            <Crosshair className="w-5 h-5 text-faint mx-auto" aria-hidden="true" />
            <p className="text-xs font-medium text-ink">
              {regions.length === 0
                ? 'No verified regions detected'
                : 'No regions match this category'}
            </p>
            <p className="text-[11px] text-muted leading-relaxed">
              {regions.length === 0
                ? 'The AI model could not localize reliable region bounds on this capture. You can still zoom and inspect the unmodified screenshot.'
                : 'Choose "All" or another category filter above.'}
            </p>
          </div>
        ) : (
          filteredRegions.map((region, index) => {
            const isSelected = selectedRegionId === region.id;
            const isHovered = hoveredRegionId === region.id;

            return (
              <div
                key={region.id}
                onMouseEnter={() => onHoverRegion(region.id)}
                onMouseLeave={() => onHoverRegion(null)}
                className={[
                  'group px-3.5 py-3 flex items-start justify-between gap-2 transition-colors',
                  isSelected
                    ? 'bg-accent-soft/80 border-l-2 border-l-accent'
                    : isHovered
                      ? 'bg-elevated/80 border-l-2 border-l-accent/50'
                      : 'bg-surface hover:bg-elevated/50 border-l-2 border-l-transparent'
                ].join(' ')}
              >
                <button
                  type="button"
                  onClick={() => onSelectRegion(region.id)}
                  aria-pressed={isSelected}
                  className="flex-1 min-w-0 text-left space-y-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent rounded"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-mono text-faint tabular-nums shrink-0">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span
                      className={[
                        'text-xs font-semibold truncate',
                        isSelected ? 'text-accent' : 'text-ink'
                      ].join(' ')}
                      title={region.name}
                    >
                      {region.name}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-5 text-[11px] text-muted">
                    <span>{REGION_CATEGORY_SHORT_LABELS[region.category]}</span>
                    <span className="text-border-strong" aria-hidden="true">
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1 capitalize">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${CONFIDENCE_DOT_STYLE[region.confidence]}`}
                        aria-hidden="true"
                      />
                      <span>{region.confidence}</span>
                    </span>
                    {region.boundaryPrecision === 'approximate' && (
                      <>
                        <span className="text-border-strong" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-faint">Approx.</span>
                      </>
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectRegion(region.id);
                    onZoomToRegion(region);
                  }}
                  aria-label={`Zoom into ${region.name}`}
                  title={`Zoom into ${region.name}`}
                  className="shrink-0 w-7 h-7 rounded-md border border-border bg-canvas/80 hover:border-accent-border hover:text-accent text-muted flex items-center justify-center transition-colors cursor-pointer mt-0.5"
                >
                  <Focus className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer grounding note */}
      {(selectedRegionId || rejectedCount > 0) && (
        <div className="px-3.5 py-2.5 border-t border-border bg-canvas/50 flex items-center justify-between gap-2 text-[11px] text-muted">
          {selectedRegionId ? (
            <button
              type="button"
              onClick={() => onSelectRegion(null)}
              className="text-accent hover:text-accent-hover font-medium transition-colors cursor-pointer"
            >
              Return to full screenshot
            </button>
          ) : (
            <span className="text-faint">Click any region to inspect</span>
          )}
          {rejectedCount > 0 && (
            <span className="font-mono text-faint shrink-0">
              {rejectedCount} invalid box{rejectedCount === 1 ? '' : 'es'} filtered
            </span>
          )}
        </div>
      )}
    </aside>
  );
};
