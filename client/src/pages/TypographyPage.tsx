import React from 'react';
import { Palette, ScanLine, Type } from 'lucide-react';
import type { ConfidenceLevel, VisualAnalysisResult } from '../types/analysis';
import type { PageId } from '../types/navigation';
import type { UploadedImage } from '../types/upload';
import { PrimaryButton, SecondaryButton } from '../components/ui/Buttons';
import { EmptyState } from '../components/ui/EmptyState';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeading } from '../components/ui/PageHeading';
import { SectionCard } from '../components/ui/SectionCard';

export interface TypographyPageProps {
  image: UploadedImage | null;
  analysisResult: VisualAnalysisResult | null;
  onNavigate: (page: PageId) => void;
}

const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence'
};

function parsePreviewFontSize(estimatedSize: string): number {
  const match = estimatedSize.match(/(\d+(?:\.\d+)?)/);
  if (!match) return 16;
  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed)) return 16;
  return Math.min(Math.max(parsed, 12), 28);
}

function parsePreviewFontWeight(estimatedWeight: string): number {
  const match = estimatedWeight.match(/(\d{3})/);
  if (match) {
    const num = Number(match[1]);
    if (num >= 100 && num <= 900) return num;
  }
  const lower = estimatedWeight.toLowerCase();
  if (lower.includes('bold')) return 700;
  if (lower.includes('semi')) return 600;
  if (lower.includes('medium')) return 500;
  if (lower.includes('light')) return 300;
  return 400;
}

export const TypographyPage: React.FC<TypographyPageProps> = ({
  image,
  analysisResult,
  onNavigate
}) => {
  if (!analysisResult || !image) {
    return (
      <PageContainer>
        <PageHeading
          title="Typography"
          description="AI-inferred typographic hierarchy, font classification, and scale."
        />
        <SectionCard>
          <EmptyState
            icon={Type}
            title="No typography interpretation yet"
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

  const { typography } = analysisResult.interpretation;
  const { model } = analysisResult.meta;

  return (
    <PageContainer>
      <PageHeading
        title="Typography"
        description={`AI-inferred type classification and hierarchy from ${image.name}.`}
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
          <p className="text-xs font-medium text-muted">Heading Style</p>
          <p className="text-sm font-semibold text-ink leading-snug">
            {typography.headingFontStyle}
          </p>
          <p className="text-xs text-muted">AI-inferred</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 space-y-1">
          <p className="text-xs font-medium text-muted">Body Style</p>
          <p className="text-sm font-semibold text-ink leading-snug">
            {typography.bodyFontStyle}
          </p>
          <p className="text-xs text-muted">AI-inferred</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 space-y-1">
          <p className="text-xs font-medium text-muted">Monospace Usage</p>
          <p className="text-sm font-semibold text-ink leading-snug">
            {typography.monospaceDetected ? 'Detected in UI' : 'Not prominently detected'}
          </p>
          <p className="text-xs text-muted font-mono">{model}</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 space-y-1">
          <p className="text-xs font-medium text-muted">Hierarchy Levels</p>
          <p className="text-sm font-semibold text-ink font-mono tabular-nums leading-snug">
            {typography.hierarchy.length} levels
          </p>
          <p className="text-xs text-muted">{CONFIDENCE_LABELS[typography.confidence]}</p>
        </div>
      </div>

      {/* Scale Summary */}
      <SectionCard
        title="Type Scale Summary (AI-Inferred)"
        description="Visual assessment of size contrast, weight distribution, and readability."
      >
        <p className="text-sm text-ink leading-relaxed">{typography.scaleSummary}</p>
      </SectionCard>

      {/* Hierarchy Breakdown */}
      <SectionCard
        title="Estimated Typographic Hierarchy"
        description="Estimated sizes, weights, and line heights inferred from screenshot proportions. Exact pixel metrics require DOM inspection."
        bodyClassName="p-0"
      >
        <div className="divide-y divide-border">
          {typography.hierarchy.map((item, index) => {
            const previewSize = parsePreviewFontSize(item.estimatedSize);
            const previewWeight = parsePreviewFontWeight(item.estimatedWeight);

            return (
              <div
                key={`${item.level}-${index}`}
                className="px-5 py-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center"
              >
                <div className="lg:col-span-5 min-w-0 space-y-1">
                  <p
                    className="text-ink truncate leading-tight"
                    style={{
                      fontSize: `${previewSize}px`,
                      fontWeight: previewWeight
                    }}
                  >
                    {item.level}
                  </p>
                  <p className="text-xs text-muted">{CONFIDENCE_LABELS[item.confidence]}</p>
                </div>

                <div className="lg:col-span-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono tabular-nums text-ink">
                  <div>
                    <span className="text-muted font-sans mr-1">Size</span>
                    <span>{item.estimatedSize}</span>
                  </div>
                  <div>
                    <span className="text-muted font-sans mr-1">Weight</span>
                    <span>{item.estimatedWeight}</span>
                  </div>
                  <div>
                    <span className="text-muted font-sans mr-1">Leading</span>
                    <span>{item.lineHeight}</span>
                  </div>
                </div>

                <p className="lg:col-span-4 text-[13px] text-muted leading-relaxed">
                  {item.usage}
                </p>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </PageContainer>
  );
};
