import React from 'react';
import { LayoutPanelTop, Palette, ScanLine } from 'lucide-react';
import type { ConfidenceLevel, VisualAnalysisResult } from '../types/analysis';
import type { PageId } from '../types/navigation';
import type { UploadedImage } from '../types/upload';
import { PrimaryButton, SecondaryButton } from '../components/ui/Buttons';
import { EmptyState } from '../components/ui/EmptyState';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeading } from '../components/ui/PageHeading';
import { SectionCard } from '../components/ui/SectionCard';

export interface LayoutPageProps {
  image: UploadedImage | null;
  analysisResult: VisualAnalysisResult | null;
  onNavigate: (page: PageId) => void;
}

const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence'
};

export const LayoutPage: React.FC<LayoutPageProps> = ({
  image,
  analysisResult,
  onNavigate
}) => {
  if (!analysisResult || !image) {
    return (
      <PageContainer>
        <PageHeading
          title="Layout"
          description="AI-inferred page structure, grid geometry, and structural regions."
        />
        <SectionCard>
          <EmptyState
            icon={LayoutPanelTop}
            title="No layout interpretation yet"
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

  const { layout } = analysisResult.interpretation;

  return (
    <PageContainer>
      <PageHeading
        title="Layout"
        description={`AI-inferred structural grid and regions observed in ${image.name}.`}
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
          <p className="text-xs font-medium text-muted">Structure Type</p>
          <p className="text-sm font-semibold text-ink leading-snug">
            {layout.structureType}
          </p>
          <p className="text-xs text-muted">{CONFIDENCE_LABELS[layout.confidence]}</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 space-y-1">
          <p className="text-xs font-medium text-muted">Grid System</p>
          <p className="text-sm font-semibold text-ink leading-snug">{layout.gridColumns}</p>
          <p className="text-xs text-muted">Estimated columns</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 space-y-1">
          <p className="text-xs font-medium text-muted">Alignment</p>
          <p className="text-sm font-semibold text-ink leading-snug">{layout.alignment}</p>
          <p className="text-xs text-muted">Primary axis</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 space-y-1">
          <p className="text-xs font-medium text-muted">Content Width</p>
          <p className="text-sm font-semibold text-ink leading-snug">{layout.contentWidth}</p>
          <p className="text-xs text-muted font-mono tabular-nums">
            Captured {image.width} × {image.height} px
          </p>
        </div>
      </div>

      {/* Structural Regions */}
      <SectionCard
        title="Structural Regions (AI-Inferred)"
        description="Major layout zones identified across the viewport with their functional roles and approximate spatial share."
        bodyClassName="p-0"
      >
        <div className="divide-y divide-border">
          {layout.regions.map((region, index) => (
            <div
              key={`${region.name}-${index}`}
              className="px-5 py-4 sm:px-6 grid grid-cols-1 md:grid-cols-12 gap-3 items-start"
            >
              <div className="md:col-span-3 flex items-baseline gap-2.5 min-w-0">
                <span className="font-mono text-xs text-muted tabular-nums shrink-0">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="text-sm font-semibold text-ink">{region.name}</h3>
              </div>

              <div className="md:col-span-3">
                <span className="font-mono text-xs text-ink bg-canvas border border-border rounded px-2 py-0.5 inline-block">
                  {region.proportion}
                </span>
              </div>

              <p className="md:col-span-6 text-[13px] text-muted leading-relaxed">
                {region.role}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>
    </PageContainer>
  );
};
