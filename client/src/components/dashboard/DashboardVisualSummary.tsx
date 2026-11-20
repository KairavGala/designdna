import React from 'react';
import { AlertCircle, ArrowRight, Layers, Wand2 } from 'lucide-react';
import type { UseVisualAnalysisResult } from '../../hooks/useVisualAnalysis';
import type { PaletteExtractionResult } from '../../types/colors';
import type { PageId } from '../../types/navigation';
import { PrimaryButton, SecondaryButton } from '../ui/Buttons';
import { EmptyState } from '../ui/EmptyState';
import { SectionCard } from '../ui/SectionCard';
import { StatusIndicator } from '../ui/StatusIndicator';
import { VISUAL_ANALYSIS_STAGE_LABELS } from '../../hooks/useVisualAnalysis';

export interface DashboardVisualSummaryProps {
  colorResult: PaletteExtractionResult | null;
  visualAnalysis: UseVisualAnalysisResult;
  onRunVisualAnalysis: () => void;
  onNavigate: (page: PageId) => void;
}

export const DashboardVisualSummary: React.FC<DashboardVisualSummaryProps> = ({
  colorResult,
  visualAnalysis,
  onRunVisualAnalysis,
  onNavigate
}) => {
  const isRunning =
    visualAnalysis.status === 'preparing' || visualAnalysis.status === 'analyzing';

  if (visualAnalysis.status === 'completed' && visualAnalysis.result) {
    const { interpretation, meta } = visualAnalysis.result;
    const { summary, typography, spacing, layout, effects, semanticColors } = interpretation;

    const topMeasured = colorResult?.colors.slice(0, 5) ?? [];
    const totalCoverage = colorResult?.statistics.coveragePercentage;

    return (
      <SectionCard
        title="Visual Analysis Summary"
        description="Structured visual characteristics clearly separating measured pixels from AI interpretation."
        action={
          <span className="text-xs font-mono text-muted">{meta.model}</span>
        }
        bodyClassName="p-0"
      >
        {/* Overall Visual Style */}
        <div className="px-5 py-4 sm:px-6 border-b border-border space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted">Overall visual style</span>
            <span className="text-[11px] font-medium text-accent">AI-Inferred</span>
          </div>
          <p className="text-sm text-ink leading-relaxed">{summary.styleSummary}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted pt-0.5">
            <span>{summary.interfaceType}</span>
            <span className="text-border-strong" aria-hidden="true">
              ·
            </span>
            <span className="capitalize">{summary.themeMode} theme</span>
            <span className="text-border-strong" aria-hidden="true">
              ·
            </span>
            <span>{summary.designTone}</span>
            <span className="text-border-strong" aria-hidden="true">
              ·
            </span>
            <span className="capitalize">{summary.overallConfidence} confidence</span>
          </div>
        </div>

        {/* Structured Property Rows */}
        <dl className="divide-y divide-border">
          {/* Colour Characteristics — Measured + AI-Inferred */}
          <div className="px-5 py-4 sm:px-6 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-xs font-semibold text-ink">Colour characteristics</dt>
              <span className="text-[11px] font-medium text-[#34D399]">
                Measured + AI-Inferred
              </span>
            </div>
            <dd className="space-y-2">
              <p className="text-[13px] text-muted leading-relaxed">
                {colorResult
                  ? `${colorResult.colors.length} dominant pixel clusters measured locally (${totalCoverage !== undefined ? `${totalCoverage.toFixed(1)}%` : '100%'} pixel coverage), mapped to ${semanticColors.length} AI-inferred semantic roles.`
                  : `${semanticColors.length} AI-inferred semantic colour roles identified.`}
              </p>
              {topMeasured.length > 0 && (
                <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                  {topMeasured.map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1.5 text-xs font-mono text-ink"
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-[3px] border border-border-strong shrink-0"
                        style={{ backgroundColor: c.hex }}
                        aria-hidden="true"
                      />
                      <span>{c.hex}</span>
                      <span className="text-muted tabular-nums">
                        {c.percentage.toFixed(1)}%
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </dd>
          </div>

          {/* Typography Characteristics */}
          <div className="px-5 py-4 sm:px-6 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center justify-center w-6 h-5 rounded bg-elevated border border-border font-semibold text-[11px] text-accent"
                  aria-hidden="true"
                >
                  Aa
                </span>
                <dt className="text-xs font-semibold text-ink">Typography</dt>
              </div>
              <span className="text-[11px] font-medium text-accent">AI-Inferred</span>
            </div>
            <dd className="text-[13px] text-muted leading-relaxed space-y-1">
              <p className="text-ink">
                {typography.headingFontStyle === typography.bodyFontStyle
                  ? `${typography.headingFontStyle} across headings and body`
                  : `${typography.headingFontStyle} headings · ${typography.bodyFontStyle} body`}
                {typography.monospaceDetected ? ' · Monospace detected' : ''}
              </p>
              <p>{typography.scaleSummary}</p>
            </dd>
          </div>

          {/* Layout Structure */}
          <div className="px-5 py-4 sm:px-6 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-0.5 px-1.5 h-5 rounded bg-elevated border border-border"
                  aria-hidden="true"
                >
                  <span className="w-1 h-2.5 rounded-[1px] bg-accent/80" />
                  <span className="w-1 h-2.5 rounded-[1px] bg-accent/50" />
                  <span className="w-1 h-2.5 rounded-[1px] bg-accent/30" />
                </span>
                <dt className="text-xs font-semibold text-ink">Layout structure</dt>
              </div>
              <span className="text-[11px] font-medium text-accent">AI-Inferred</span>
            </div>
            <dd className="text-[13px] text-muted leading-relaxed">
              <span className="text-ink">{layout.structureType}</span>
              <span className="mx-1.5 text-border-strong" aria-hidden="true">
                ·
              </span>
              <span>{layout.gridColumns}</span>
              <span className="mx-1.5 text-border-strong" aria-hidden="true">
                ·
              </span>
              <span>{layout.alignment}</span>
              <span className="mx-1.5 text-border-strong" aria-hidden="true">
                ·
              </span>
              <span className="font-mono">{layout.contentWidth}</span>
            </dd>
          </div>

          {/* Spacing & Density */}
          <div className="px-5 py-4 sm:px-6 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-end gap-0.5 px-1.5 h-5 rounded bg-elevated border border-border pb-1"
                  aria-hidden="true"
                >
                  <span className="w-1 h-1.5 rounded-[1px] bg-accent/40" />
                  <span className="w-1 h-2 rounded-[1px] bg-accent/70" />
                  <span className="w-1 h-2.5 rounded-[1px] bg-accent" />
                </span>
                <dt className="text-xs font-semibold text-ink">Spacing &amp; density</dt>
              </div>
              <span className="text-[11px] font-medium text-accent">AI-Inferred</span>
            </div>
            <dd className="text-[13px] text-muted leading-relaxed">
              <span className="font-mono text-ink">{spacing.baseUnit}</span> base unit
              <span className="mx-1.5 text-border-strong" aria-hidden="true">
                ·
              </span>
              <span className="capitalize text-ink">{spacing.density}</span> density
              <span className="mx-1.5 text-border-strong" aria-hidden="true">
                ·
              </span>
              <span>{spacing.sectionRhythm}</span>
            </dd>
          </div>

          {/* Notable Visual Effects */}
          <div className="px-5 py-4 sm:px-6 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center justify-center w-6 h-5 rounded bg-elevated border border-border"
                  aria-hidden="true"
                >
                  <span className="w-2.5 h-2.5 rounded-sm border-t-2 border-l-2 border-accent" />
                </span>
                <dt className="text-xs font-semibold text-ink">Visual effects</dt>
              </div>
              <span className="text-[11px] font-medium text-accent">AI-Inferred</span>
            </div>
            <dd className="text-[13px] text-muted leading-relaxed">
              <span className="capitalize text-ink">
                {effects.elevationStyle.replace(/-/g, ' ')}
              </span>
              <span className="mx-1.5 text-border-strong" aria-hidden="true">
                ·
              </span>
              <span>{effects.borderStyle}</span>
              <span className="mx-1.5 text-border-strong" aria-hidden="true">
                ·
              </span>
              <span>{effects.shadowStyle}</span>
            </dd>
          </div>
        </dl>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Visual Analysis Summary"
      description="AI-inferred style, typography, layout, spacing, and visual effects."
    >
      {isRunning && visualAnalysis.stage ? (
        <div className="py-6">
          <StatusIndicator
            variant="loading"
            label="Running AI Visual Interpretation"
            detail={VISUAL_ANALYSIS_STAGE_LABELS[visualAnalysis.stage]}
          />
        </div>
      ) : visualAnalysis.status === 'error' && visualAnalysis.error ? (
        <div className="space-y-4">
          <div
            role="alert"
            className="bg-[#F87171]/10 border border-[#F87171]/30 rounded-lg px-4 py-3 flex items-start gap-3"
          >
            <AlertCircle
              className="w-4 h-4 text-[#F87171] shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-[#FCA5A5]">
                {visualAnalysis.error.title}
              </p>
              <p className="text-xs text-[#FCA5A5]/85 leading-relaxed break-words">
                {visualAnalysis.error.message}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PrimaryButton size="sm" onClick={onRunVisualAnalysis}>
              <Wand2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Retry Visual Interpretation</span>
            </PrimaryButton>
            <SecondaryButton size="sm" onClick={() => onNavigate('colors')}>
              <span>Inspect Colors</span>
              <ArrowRight className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
            </SecondaryButton>
          </div>
        </div>
      ) : colorResult ? (
        <EmptyState
          compact
          icon={Wand2}
          title="AI Visual Interpretation not run yet"
          description="Your measured pixel colours are ready. Run AI Visual Interpretation to infer style summary, typography, spacing rhythm, layout structure, and visual effects."
          action={
            <PrimaryButton size="sm" onClick={onRunVisualAnalysis}>
              <Wand2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Run AI Visual Interpretation</span>
            </PrimaryButton>
          }
        />
      ) : (
        <EmptyState
          compact
          icon={Layers}
          title="Awaiting colour extraction"
          description="Extract measured colours from your uploaded screenshot first. Visual interpretation grounds its findings in your measured palette."
        />
      )}
    </SectionCard>
  );
};
