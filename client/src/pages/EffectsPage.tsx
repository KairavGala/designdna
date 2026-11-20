import React from 'react';
import { Layers, Palette, ScanLine } from 'lucide-react';
import type { ConfidenceLevel, VisualAnalysisResult } from '../types/analysis';
import type { PageId } from '../types/navigation';
import type { UploadedImage } from '../types/upload';
import { PrimaryButton, SecondaryButton } from '../components/ui/Buttons';
import { EmptyState } from '../components/ui/EmptyState';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeading } from '../components/ui/PageHeading';
import { SectionCard } from '../components/ui/SectionCard';

export interface EffectsPageProps {
  image: UploadedImage | null;
  analysisResult: VisualAnalysisResult | null;
  onNavigate: (page: PageId) => void;
}

const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence'
};

const ELEVATION_LABELS: Record<
  VisualAnalysisResult['interpretation']['effects']['elevationStyle'],
  string
> = {
  flat: 'Flat surfaces',
  'subtle-border': 'Subtle borders',
  'layered-shadow': 'Layered shadows',
  glass: 'Translucent / Glass'
};

function parsePreviewRadius(value: string): string {
  const lower = value.toLowerCase();
  if (lower.includes('full') || lower.includes('999') || lower.includes('pill')) {
    return '9999px';
  }
  const match = value.match(/(\d+(?:\.\d+)?)/);
  if (!match) return '6px';
  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed)) return '6px';
  return `${Math.min(Math.max(parsed, 0), 20)}px`;
}

export const EffectsPage: React.FC<EffectsPageProps> = ({
  image,
  analysisResult,
  onNavigate
}) => {
  if (!analysisResult || !image) {
    return (
      <PageContainer>
        <PageHeading
          title="Effects"
          description="AI-inferred elevation hierarchy, borders, shadows, and corner radius tokens."
        />
        <SectionCard>
          <EmptyState
            icon={Layers}
            title="No visual effects interpretation yet"
            description="Extract measured colours from a screenshot first, then run AI Visual Interpretation from the Colors page."
            action={
              <PrimaryButton onClick={() => onNavigate(image ? 'colors' : 'new-analysis')}>
                {image ? (
                  <>
                    <Palette className="w-4 h-4" aria-hidden="true" />
                    <span>Go to Colors</span>
                  </>
                ) : (
                  <>
                    <ScanLine className="w-4 h-4" aria-hidden="true" />
                    <span>Go to New Analysis</span>
                  </>
                )}
              </PrimaryButton>
            }
          />
        </SectionCard>
      </PageContainer>
    );
  }

  const { effects } = analysisResult.interpretation;

  return (
    <PageContainer>
      <PageHeading
        title="Effects"
        description={`AI-inferred surface elevation, border treatment, and corner radii from ${image.name}.`}
        action={
          <SecondaryButton size="sm" onClick={() => onNavigate('colors')}>
            <Palette className="w-4 h-4 text-muted" aria-hidden="true" />
            <span>Back to Colors</span>
          </SecondaryButton>
        }
      />

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4 space-y-1">
          <p className="text-xs font-medium text-muted">Elevation Model</p>
          <p className="text-sm font-semibold text-ink">
            {ELEVATION_LABELS[effects.elevationStyle]}
          </p>
          <p className="text-xs text-muted">{CONFIDENCE_LABELS[effects.confidence]}</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 space-y-1">
          <p className="text-xs font-medium text-muted">Border Style</p>
          <p className="text-sm font-semibold text-ink leading-snug">{effects.borderStyle}</p>
          <p className="text-xs text-muted">AI-inferred</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 space-y-1">
          <p className="text-xs font-medium text-muted">Shadow Treatment</p>
          <p className="text-sm font-semibold text-ink leading-snug">{effects.shadowStyle}</p>
          <p className="text-xs text-muted">AI-inferred</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 space-y-1">
          <p className="text-xs font-medium text-muted">Radius Tokens</p>
          <p className="text-sm font-semibold text-ink font-mono tabular-nums">
            {effects.borderRadiusScale.length} steps
          </p>
          <p className="text-xs text-muted">Estimated corner scale</p>
        </div>
      </div>

      {/* Border Radius Scale */}
      <SectionCard
        title="Border Radius Scale (AI-Inferred)"
        description="Estimated corner radii observed across controls, containers, and elevated surfaces."
        bodyClassName="p-0"
      >
        <div className="divide-y divide-border">
          {effects.borderRadiusScale.map((item, index) => {
            const previewRadius = parsePreviewRadius(item.value);

            return (
              <div
                key={`${item.label}-${index}`}
                className="px-5 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className="w-10 h-10 bg-canvas border-2 border-accent/70 shrink-0"
                    style={{ borderRadius: previewRadius }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                      <h3 className="text-sm font-semibold text-ink">{item.label}</h3>
                      <span className="font-mono text-xs text-muted tabular-nums">
                        {item.value}
                      </span>
                    </div>
                    <p className="text-[13px] text-muted leading-relaxed">{item.usage}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Surface Notes */}
      <SectionCard
        title="Surface & Visual Depth Notes"
        description="Additional observations on contrast separation, dividers, and surface hierarchy."
      >
        <p className="text-sm text-ink leading-relaxed">{effects.notes}</p>
      </SectionCard>
    </PageContainer>
  );
};
