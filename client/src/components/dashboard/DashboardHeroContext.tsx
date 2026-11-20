import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  Loader2,
  Maximize2,
  RefreshCw
} from 'lucide-react';
import type { DashboardState } from '../../services/dashboard/deriveDashboardState';
import type { UploadedImage } from '../../types/upload';
import {
  formatAspectRatio,
  formatFileSize,
  getImageOrientation
} from '../../utils/imageValidation';
import { SectionCard } from '../ui/SectionCard';
import { ScreenshotLightbox } from './ScreenshotLightbox';

export interface DashboardHeroContextProps {
  image: UploadedImage;
  dashboard: DashboardState;
  onReplaceScreenshot: () => void;
}

const CONFIDENCE_TEXT_COLOR = {
  high: 'text-[#34D399]',
  medium: 'text-[#FBBF24]',
  low: 'text-[#F87171]'
} as const;

export const DashboardHeroContext: React.FC<DashboardHeroContextProps> = ({
  image,
  dashboard,
  onReplaceScreenshot
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const orientation = getImageOrientation(image.width, image.height);
  const aspectRatio = formatAspectRatio(image.width, image.height);

  return (
    <>
      <SectionCard bodyClassName="p-0 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left: Original Screenshot Context */}
          <div className="lg:col-span-5 bg-canvas border-b lg:border-b-0 lg:border-r border-border p-5 sm:p-6 flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted">Active Screenshot</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-ink hover:text-accent transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Expand</span>
                  </button>
                  <span className="text-border-strong" aria-hidden="true">
                    ·
                  </span>
                  <button
                    type="button"
                    onClick={onReplaceScreenshot}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Replace</span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                aria-label={`Expand preview of ${image.name}`}
                className="group relative block w-full overflow-hidden rounded-lg border border-border hover:border-accent-border bg-canvas transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
              >
                <div className="aspect-[16/10] w-full flex items-center justify-center p-2.5 bg-canvas">
                  <img
                    src={image.previewUrl}
                    alt={`Uploaded screenshot ${image.name}`}
                    className="max-h-full max-w-full w-auto h-auto object-contain rounded-[4px]"
                  />
                </div>
              </button>
            </div>

            <div className="space-y-1 pt-1">
              <p
                className="text-sm font-semibold text-ink truncate"
                title={image.name}
              >
                {image.name}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted font-mono tabular-nums">
                <span>
                  {image.width} × {image.height}px
                </span>
                <span className="text-border-strong font-sans" aria-hidden="true">
                  ·
                </span>
                <span>{image.format}</span>
                <span className="text-border-strong font-sans" aria-hidden="true">
                  ·
                </span>
                <span>{formatFileSize(image.size)}</span>
                <span className="text-border-strong font-sans" aria-hidden="true">
                  ·
                </span>
                <span className="font-sans">{orientation}</span>
                <span className="text-border-strong font-sans" aria-hidden="true">
                  ·
                </span>
                <span>{aspectRatio}</span>
              </div>
            </div>
          </div>

          {/* Right: Pipeline Status, Core Metrics, Provenance & Confidence */}
          <div className="lg:col-span-7 flex flex-col divide-y divide-border">
            {/* Completion Pipeline Strip */}
            <div className="p-5 sm:p-6 space-y-3.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-ink">
                    {dashboard.statusLabel}
                  </h2>
                  <p className="text-xs text-muted mt-0.5 leading-relaxed">
                    {dashboard.statusDescription}
                  </p>
                </div>
                <span className="text-xs font-mono text-ink tabular-nums shrink-0">
                  {dashboard.unlockedCount} / {dashboard.totalSectionCount} sections ready
                </span>
              </div>

              <ol className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                {dashboard.pipelineSteps.map((step) => (
                  <li key={step.id} className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      {step.state === 'completed' ? (
                        <Check
                          className="w-3.5 h-3.5 text-[#34D399] shrink-0"
                          strokeWidth={2.25}
                          aria-hidden="true"
                        />
                      ) : step.state === 'active' ? (
                        <Loader2
                          className="w-3.5 h-3.5 text-accent animate-spin shrink-0"
                          aria-hidden="true"
                        />
                      ) : step.state === 'error' ? (
                        <AlertCircle
                          className="w-3.5 h-3.5 text-[#F87171] shrink-0"
                          aria-hidden="true"
                        />
                      ) : (
                        <span
                          className="w-3.5 h-3.5 inline-flex items-center justify-center text-[11px] font-mono text-faint shrink-0"
                          aria-hidden="true"
                        >
                          —
                        </span>
                      )}
                      <span
                        className={
                          step.state === 'pending'
                            ? 'text-muted truncate'
                            : 'text-ink truncate'
                        }
                      >
                        {step.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted font-mono tabular-nums truncate pl-5">
                      {step.detail}
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            {/* 4 Key Token Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 divide-x divide-border">
              <div className="p-4 sm:px-5 sm:py-4 space-y-1">
                <p className="text-xs text-muted">{dashboard.metrics.colorLabel}</p>
                <p className="text-xl font-semibold text-ink font-mono tabular-nums">
                  {dashboard.metrics.colorCount ?? '—'}
                </p>
              </div>
              <div className="p-4 sm:px-5 sm:py-4 space-y-1">
                <p className="text-xs text-muted">Typography tokens</p>
                <p className="text-xl font-semibold text-ink font-mono tabular-nums">
                  {dashboard.metrics.typographyCount ?? '—'}
                </p>
              </div>
              <div className="p-4 sm:px-5 sm:py-4 space-y-1">
                <p className="text-xs text-muted">Spacing tokens</p>
                <p className="text-xl font-semibold text-ink font-mono tabular-nums">
                  {dashboard.metrics.spacingCount ?? '—'}
                </p>
              </div>
              <div className="p-4 sm:px-5 sm:py-4 space-y-1">
                <p className="text-xs text-muted">Total tokens</p>
                <p className="text-xl font-semibold text-ink font-mono tabular-nums">
                  {dashboard.metrics.totalTokens ?? '—'}
                </p>
              </div>
            </div>

            {/* Provenance & Confidence Distribution */}
            <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Provenance Breakdown */}
              <div className="space-y-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs font-semibold text-ink">Provenance breakdown</p>
                  {dashboard.provenance && (
                    <span className="text-[11px] text-muted font-mono tabular-nums">
                      {dashboard.provenance.total} items
                    </span>
                  )}
                </div>

                {dashboard.provenance ? (
                  <>
                    <div
                      className="h-2 w-full rounded-full bg-subtle overflow-hidden flex"
                      aria-label={`Provenance: ${dashboard.provenance.measured} measured, ${dashboard.provenance.aiInferred} AI-inferred, ${dashboard.provenance.derived} derived`}
                    >
                      {dashboard.provenance.measured > 0 && (
                        <div
                          className="h-full bg-[#34D399]"
                          style={{
                            width: `${(dashboard.provenance.measured / dashboard.provenance.total) * 100}%`
                          }}
                        />
                      )}
                      {dashboard.provenance.aiInferred > 0 && (
                        <div
                          className="h-full bg-accent"
                          style={{
                            width: `${(dashboard.provenance.aiInferred / dashboard.provenance.total) * 100}%`
                          }}
                        />
                      )}
                      {dashboard.provenance.derived > 0 && (
                        <div
                          className="h-full bg-[#FBBF24]"
                          style={{
                            width: `${(dashboard.provenance.derived / dashboard.provenance.total) * 100}%`
                          }}
                        />
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-[2px] bg-[#34D399]" aria-hidden="true" />
                        <span>Measured</span>
                        <span className="font-mono text-ink tabular-nums">
                          {dashboard.provenance.measured}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-[2px] bg-accent" aria-hidden="true" />
                        <span>AI-Inferred</span>
                        <span className="font-mono text-ink tabular-nums">
                          {dashboard.provenance.aiInferred}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-[2px] bg-[#FBBF24]" aria-hidden="true" />
                        <span>Derived</span>
                        <span className="font-mono text-ink tabular-nums">
                          {dashboard.provenance.derived}
                        </span>
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted leading-relaxed">
                    Run colour extraction to record measured pixel data and provenance.
                  </p>
                )}
              </div>

              {/* Confidence Overview */}
              <div className="space-y-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs font-semibold text-ink">Confidence overview</p>
                  {dashboard.confidence?.overallConfidence && (
                    <span
                      className={`text-[11px] font-medium capitalize ${CONFIDENCE_TEXT_COLOR[dashboard.confidence.overallConfidence]}`}
                    >
                      {dashboard.confidence.overallConfidence} overall
                    </span>
                  )}
                </div>

                {dashboard.confidence ? (
                  <>
                    <div
                      className="h-2 w-full rounded-full bg-subtle overflow-hidden flex"
                      aria-label={`Confidence: ${dashboard.confidence.high} high, ${dashboard.confidence.medium} medium, ${dashboard.confidence.low} low`}
                    >
                      {dashboard.confidence.high > 0 && (
                        <div
                          className="h-full bg-[#34D399]"
                          style={{
                            width: `${(dashboard.confidence.high / dashboard.confidence.total) * 100}%`
                          }}
                        />
                      )}
                      {dashboard.confidence.medium > 0 && (
                        <div
                          className="h-full bg-[#FBBF24]"
                          style={{
                            width: `${(dashboard.confidence.medium / dashboard.confidence.total) * 100}%`
                          }}
                        />
                      )}
                      {dashboard.confidence.low > 0 && (
                        <div
                          className="h-full bg-[#F87171]"
                          style={{
                            width: `${(dashboard.confidence.low / dashboard.confidence.total) * 100}%`
                          }}
                        />
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      <span>
                        High{' '}
                        <span className="font-mono text-ink tabular-nums">
                          {dashboard.confidence.high}
                        </span>
                      </span>
                      <span className="text-border-strong" aria-hidden="true">
                        ·
                      </span>
                      <span>
                        Medium{' '}
                        <span className="font-mono text-ink tabular-nums">
                          {dashboard.confidence.medium}
                        </span>
                      </span>
                      <span className="text-border-strong" aria-hidden="true">
                        ·
                      </span>
                      <span>
                        Low{' '}
                        <span className="font-mono text-ink tabular-nums">
                          {dashboard.confidence.low}
                        </span>
                      </span>
                    </div>
                    <p className="text-[11px] text-muted">{dashboard.confidence.sourceLabel}</p>
                  </>
                ) : (
                  <p className="text-xs text-muted leading-relaxed">
                    Confidence metrics populate automatically once extraction runs.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <ScreenshotLightbox
        image={image}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
};
