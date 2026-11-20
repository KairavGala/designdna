import React from 'react';
import type { ExtractedColor, ExtractionStatistics } from '../../types/colors';
import { SectionCard } from '../ui/SectionCard';

export interface ColorStatisticsProps {
  colors: ExtractedColor[];
  statistics: ExtractionStatistics;
}

export const ColorStatistics: React.FC<ColorStatisticsProps> = ({
  colors,
  statistics
}) => {
  const dominant = colors[0];
  const { processedDimensions, originalDimensions } = statistics;

  return (
    <SectionCard
      title="Measured Extraction Overview"
      description="Calculated directly from sampled screenshot pixels in browser memory — no AI colour inference."
      bodyClassName="p-0"
    >
      <dl className="grid grid-cols-2 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-border text-sm">
        {/* Extracted count */}
        <div className="p-4 sm:p-5">
          <dt className="text-xs text-muted">Extracted Colours</dt>
          <dd className="mt-1.5 font-mono text-lg font-semibold text-ink tabular-nums">
            {colors.length}
          </dd>
          <p className="mt-1 text-[11px] text-muted tabular-nums">
            {statistics.coveragePercentage.toFixed(1)}% area covered
          </p>
        </div>

        {/* Most dominant measured colour */}
        <div className="p-4 sm:p-5 border-l border-border lg:border-l-0">
          <dt className="text-xs text-muted">Most Dominant Measured</dt>
          {dominant ? (
            <>
              <dd className="mt-1.5 flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded border border-border-strong shrink-0"
                  style={{ backgroundColor: dominant.hex }}
                  aria-hidden="true"
                />
                <span className="font-mono text-sm font-semibold text-ink">
                  {dominant.hex}
                </span>
              </dd>
              <p className="mt-1 text-[11px] text-muted tabular-nums">
                {dominant.percentage.toFixed(1)}% of sampled pixels
              </p>
            </>
          ) : (
            <dd className="mt-1.5 text-sm text-muted">—</dd>
          )}
        </div>

        {/* Total sampled pixels */}
        <div className="p-4 sm:p-5">
          <dt className="text-xs text-muted">Sampled Pixels</dt>
          <dd className="mt-1.5 font-mono text-sm font-semibold text-ink tabular-nums">
            {statistics.sampledPixels.toLocaleString()}
          </dd>
          <p className="mt-1 text-[11px] text-muted tabular-nums">
            {statistics.excludedTransparentPixels > 0
              ? `${statistics.excludedTransparentPixels.toLocaleString()} transparent skipped`
              : `${statistics.uniqueQuantizedBins.toLocaleString()} colour bins`}
          </p>
        </div>

        {/* Processing resolution */}
        <div className="p-4 sm:p-5 border-l border-border lg:border-l-0">
          <dt className="text-xs text-muted">Processing Resolution</dt>
          <dd className="mt-1.5 font-mono text-sm font-semibold text-ink tabular-nums">
            {processedDimensions.width} × {processedDimensions.height} px
          </dd>
          <p className="mt-1 text-[11px] text-muted tabular-nums">
            Source {originalDimensions.width} × {originalDimensions.height} px
          </p>
        </div>

        {/* Extraction method */}
        <div className="p-4 sm:p-5 col-span-2 lg:col-span-1">
          <dt className="text-xs text-muted">Extraction Method</dt>
          <dd className="mt-1.5 text-[13px] font-medium text-ink leading-snug">
            {statistics.method}
          </dd>
          <p className="mt-1 text-[11px] font-mono text-muted tabular-nums">
            Completed in {statistics.durationMs} ms
          </p>
        </div>
      </dl>
    </SectionCard>
  );
};
