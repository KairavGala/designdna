import React from 'react';
import { Palette, Ruler, ScanLine } from 'lucide-react';
import type { ConfidenceLevel, VisualAnalysisResult } from '../types/analysis';
import type { PageId } from '../types/navigation';
import type { UploadedImage } from '../types/upload';
import { PrimaryButton, SecondaryButton } from '../components/ui/Buttons';
import { EmptyState } from '../components/ui/EmptyState';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeading } from '../components/ui/PageHeading';
import { SectionCard } from '../components/ui/SectionCard';

export interface SpacingPageProps {
  image: UploadedImage | null;
  analysisResult: VisualAnalysisResult | null;
  onNavigate: (page: PageId) => void;
}

const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence'
};

function parsePixelWidth(value: string): number {
  const match = value.match(/(\d+(?:\.\d+)?)/);
  if (!match) return 16;
  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed)) return 16;
  return Math.min(Math.max(parsed * 2, 8), 160);
}

export const SpacingPage: React.FC<SpacingPageProps> = ({
  image,
  analysisResult,
  onNavigate
}) => {
  if (!analysisResult || !image) {
    return (
      <PageContainer>
        <PageHeading
          title="Spacing"
          description="AI-inferred base unit, interface density, and spatial rhythm."
        />
        <SectionCard>
          <EmptyState
            icon={Ruler}
            title="No spacing interpretation yet"
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

  const { spacing } = analysisResult.interpretation;

  return (
    <PageContainer>
      <PageHeading
        title="Spacing"
        description={`AI-inferred spacing rhythm and padding patterns from ${image.name}.`}
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
          <p className="text-xs font-medium text-muted">Estimated Base Unit</p>
          <p className="text-sm font-semibold text-ink font-mono tabular-nums">
            {spacing.baseUnit}
          </p>
          <p className="text-xs text-muted">AI-inferred grid step</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 space-y-1">
          <p className="text-xs font-medium text-muted">Layout Density</p>
          <p className="text-sm font-semibold text-ink capitalize">{spacing.density}</p>
          <p className="text-xs text-muted">Visual whitespace profile</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 space-y-1">
          <p className="text-xs font-medium text-muted">Container Padding</p>
          <p className="text-sm font-semibold text-ink">{spacing.containerPadding}</p>
          <p className="text-xs text-muted">Estimated inset</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 space-y-1">
          <p className="text-xs font-medium text-muted">Scale Steps</p>
          <p className="text-sm font-semibold text-ink font-mono tabular-nums">
            {spacing.scaleSteps.length} steps
          </p>
          <p className="text-xs text-muted">{CONFIDENCE_LABELS[spacing.confidence]}</p>
        </div>
      </div>

      {/* Section Rhythm */}
      <SectionCard
        title="Section Rhythm & Whitespace (AI-Inferred)"
        description="Observed vertical and horizontal spacing relationships across the screenshot."
      >
        <p className="text-sm text-ink leading-relaxed">{spacing.sectionRhythm}</p>
      </SectionCard>

      {/* Spacing Scale Steps */}
      <SectionCard
        title="Estimated Spacing Scale"
        description="Provisional spacing tokens inferred from component padding, element gaps, and section margins."
        bodyClassName="p-0"
      >
        <div className="divide-y divide-border">
          {spacing.scaleSteps.map((step, index) => {
            const barWidth = parsePixelWidth(step.value);

            return (
              <div
                key={`${step.token}-${index}`}
                className="px-5 py-4 sm:px-6 grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
              >
                <div className="md:col-span-3 flex items-baseline gap-2.5 min-w-0">
                  <span className="font-mono text-xs font-semibold text-ink bg-canvas border border-border rounded px-2 py-0.5 shrink-0">
                    {step.token}
                  </span>
                  <span className="font-mono text-[13px] text-muted tabular-nums">
                    {step.value}
                  </span>
                </div>

                <div className="md:col-span-4 flex items-center">
                  <div className="w-full max-w-[180px] h-5 flex items-center">
                    <div
                      className="h-2.5 rounded-sm bg-accent/80"
                      style={{ width: `${barWidth}px` }}
                      aria-hidden="true"
                    />
                  </div>
                </div>

                <p className="md:col-span-5 text-[13px] text-muted leading-relaxed">
                  {step.usage}
                </p>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </PageContainer>
  );
};
