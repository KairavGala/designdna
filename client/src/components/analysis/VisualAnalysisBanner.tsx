import React from 'react';
import { AlertCircle, ArrowRight, RefreshCw, Wand2 } from 'lucide-react';
import {
  VISUAL_ANALYSIS_STAGE_LABELS,
  type UseVisualAnalysisResult
} from '../../hooks/useVisualAnalysis';
import type { PageId } from '../../types/navigation';
import { PrimaryButton, SecondaryButton } from '../ui/Buttons';
import { SectionCard } from '../ui/SectionCard';
import { StatusIndicator } from '../ui/StatusIndicator';

export interface VisualAnalysisBannerProps {
  analysis: UseVisualAnalysisResult;
  onRunAnalysis: () => void;
  onNavigate?: (page: PageId) => void;
}

export const VisualAnalysisBanner: React.FC<VisualAnalysisBannerProps> = ({
  analysis,
  onRunAnalysis,
  onNavigate
}) => {
  const isRunning = analysis.status === 'preparing' || analysis.status === 'analyzing';

  if (analysis.status === 'completed' && analysis.result) {
    const { summary } = analysis.result.interpretation;
    const { model, durationMs } = analysis.result.meta;

    return (
      <SectionCard
        title="AI Visual Interpretation"
        description="Inferred from screenshot structure and grounded in your measured palette. Design System sections are now unlocked."
        action={
          <SecondaryButton size="sm" onClick={onRunAnalysis}>
            <RefreshCw className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
            <span>Re-run</span>
          </SecondaryButton>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-sm text-ink leading-relaxed">{summary.styleSummary}</p>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted">
              <span>{summary.interfaceType}</span>
              <span className="text-border-strong" aria-hidden="true">·</span>
              <span className="capitalize">{summary.themeMode} theme</span>
              <span className="text-border-strong" aria-hidden="true">·</span>
              <span>{summary.designTone}</span>
              <span className="text-border-strong" aria-hidden="true">·</span>
              <span className="font-mono">{model}</span>
              <span className="text-border-strong" aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{(durationMs / 1000).toFixed(2)}s</span>
            </div>
          </div>

          {onNavigate && (
            <div className="pt-3 border-t border-border flex flex-wrap items-center gap-2">
              {(
                [
                  { id: 'typography', label: 'Typography' },
                  { id: 'spacing', label: 'Spacing' },
                  { id: 'components', label: 'Components' },
                  { id: 'layout', label: 'Layout' },
                  { id: 'effects', label: 'Effects' },
                  { id: 'design-tokens', label: 'Design Tokens' }
                ] as const
              ).map((section) => (
                <SecondaryButton
                  key={section.id}
                  size="sm"
                  onClick={() => onNavigate(section.id)}
                >
                  <span>{section.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
                </SecondaryButton>
              ))}
            </div>
          )}
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="AI Visual Interpretation"
      description="Infer semantic colour roles, typography hierarchy, spacing rhythm, UI components, layout structure, and visual effects via Gemini."
    >
      <div className="space-y-4">
        {analysis.status === 'error' && analysis.error && (
          <div
            role="alert"
            aria-live="assertive"
            className="bg-[#F87171]/10 border border-[#F87171]/30 rounded-lg px-4 py-3 flex items-start gap-3"
          >
            <AlertCircle
              className="w-4 h-4 text-[#F87171] shrink-0 mt-0.5"
              strokeWidth={2}
              aria-hidden="true"
            />
            <div className="min-w-0 space-y-1.5">
              <p className="text-sm font-semibold text-[#FCA5A5]">
                {analysis.error.title}
              </p>
              <p className="text-[13px] text-[#FECACA]/85 leading-relaxed break-words">
                {analysis.error.message}
              </p>
              {analysis.error.details && (
                <dl className="pt-2 mt-1 border-t border-[#F87171]/25 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#FECACA] font-mono">
                  {analysis.error.details.upstreamStatus !== undefined && (
                    <div>
                      <dt className="inline font-sans text-[#FCA5A5]/75 mr-1">HTTP:</dt>
                      <dd className="inline">{analysis.error.details.upstreamStatus}</dd>
                    </div>
                  )}
                  {analysis.error.details.geminiStatus && (
                    <div>
                      <dt className="inline font-sans text-[#FCA5A5]/75 mr-1">Status:</dt>
                      <dd className="inline">{analysis.error.details.geminiStatus}</dd>
                    </div>
                  )}
                  {analysis.error.details.model && (
                    <div>
                      <dt className="inline font-sans text-[#FCA5A5]/75 mr-1">Model:</dt>
                      <dd className="inline">{analysis.error.details.model}</dd>
                    </div>
                  )}
                  {analysis.error.details.quotaMetric && (
                    <div className="break-all">
                      <dt className="inline font-sans text-[#FCA5A5]/75 mr-1">Quota metric:</dt>
                      <dd className="inline">{analysis.error.details.quotaMetric}</dd>
                    </div>
                  )}
                  {analysis.error.details.quotaId && (
                    <div className="break-all">
                      <dt className="inline font-sans text-[#FCA5A5]/75 mr-1">Quota ID:</dt>
                      <dd className="inline">{analysis.error.details.quotaId}</dd>
                    </div>
                  )}
                  {analysis.error.details.quotaLimit && (
                    <div>
                      <dt className="inline font-sans text-[#FCA5A5]/75 mr-1">Limit:</dt>
                      <dd className="inline">{analysis.error.details.quotaLimit}</dd>
                    </div>
                  )}
                  {analysis.error.details.retryDelay && (
                    <div>
                      <dt className="inline font-sans text-[#FCA5A5]/75 mr-1">Retry after:</dt>
                      <dd className="inline">{analysis.error.details.retryDelay}</dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
          </div>
        )}

        {isRunning && analysis.stage ? (
          <div aria-live="polite" className="py-1">
            <StatusIndicator
              variant="loading"
              label="Running visual interpretation"
              detail={VISUAL_ANALYSIS_STAGE_LABELS[analysis.stage]}
            />
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-[13px] text-muted leading-relaxed max-w-2xl">
              Sends a resized copy of this screenshot and its measured colour palette transiently to
              the Express backend for structured Gemini analysis. Screenshots are never stored on
              disk or in a database.
            </p>
            <PrimaryButton
              onClick={onRunAnalysis}
              disabled={isRunning}
              className="w-full sm:w-auto"
            >
              <Wand2 className="w-4 h-4" aria-hidden="true" />
              <span>
                {analysis.status === 'error'
                  ? 'Retry Visual Interpretation'
                  : 'Run AI Visual Interpretation'}
              </span>
            </PrimaryButton>
          </div>
        )}
      </div>
    </SectionCard>
  );
};
