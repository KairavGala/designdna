import React from 'react';
import { Component, Palette, ScanLine } from 'lucide-react';
import type {
  ComponentCategory,
  ConfidenceLevel,
  VisualAnalysisResult
} from '../types/analysis';
import type { PageId } from '../types/navigation';
import type { UploadedImage } from '../types/upload';
import { PrimaryButton, SecondaryButton } from '../components/ui/Buttons';
import { EmptyState } from '../components/ui/EmptyState';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeading } from '../components/ui/PageHeading';
import { SectionCard } from '../components/ui/SectionCard';

export interface ComponentsPageProps {
  image: UploadedImage | null;
  analysisResult: VisualAnalysisResult | null;
  onNavigate: (page: PageId) => void;
}

const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence'
};

const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  navigation: 'Navigation',
  button: 'Button',
  card: 'Card',
  input: 'Input',
  badge: 'Badge',
  table: 'Table',
  modal: 'Modal',
  other: 'UI Element'
};

export const ComponentsPage: React.FC<ComponentsPageProps> = ({
  image,
  analysisResult,
  onNavigate
}) => {
  if (!analysisResult || !image) {
    return (
      <PageContainer>
        <PageHeading
          title="Components"
          description="AI-inferred inventory of recurring interface components and their visual treatments."
        />
        <SectionCard>
          <EmptyState
            icon={Component}
            title="No components interpreted yet"
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

  const { components, summary } = analysisResult.interpretation;
  const distinctCategories = new Set(components.map((c) => c.category)).size;

  return (
    <PageContainer>
      <PageHeading
        title="Components"
        description={`AI-inferred UI component patterns identified in ${image.name}.`}
        action={
          <SecondaryButton size="sm" onClick={() => onNavigate('colors')}>
            <Palette className="w-4 h-4 text-muted" aria-hidden="true" />
            <span>Back to Colors</span>
          </SecondaryButton>
        }
      />

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4 space-y-1">
          <p className="text-xs font-medium text-muted">Detected Components</p>
          <p className="text-sm font-semibold text-ink font-mono tabular-nums">
            {components.length} patterns
          </p>
          <p className="text-xs text-muted">AI-inferred from screenshot</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 space-y-1">
          <p className="text-xs font-medium text-muted">Component Categories</p>
          <p className="text-sm font-semibold text-ink font-mono tabular-nums">
            {distinctCategories} categories
          </p>
          <p className="text-xs text-muted">{summary.interfaceType}</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 space-y-1">
          <p className="text-xs font-medium text-muted">Design Tone</p>
          <p className="text-sm font-semibold text-ink">{summary.designTone}</p>
          <p className="text-xs text-muted">{CONFIDENCE_LABELS[summary.overallConfidence]}</p>
        </div>
      </div>

      {/* Component Inventory */}
      <SectionCard
        title="Component Anatomy Inventory (AI-Inferred)"
        description="Recurring interface elements observed in the screenshot with estimated corner radius, emphasis, and visual treatment."
        bodyClassName="p-0"
      >
        <div className="divide-y divide-border">
          {components.map((component, index) => (
            <div
              key={`${component.name}-${component.category}-${index}`}
              className="px-5 py-4 sm:px-6 space-y-2"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                  <h3 className="text-sm font-semibold text-ink">{component.name}</h3>
                  <span className="text-xs font-medium text-accent">
                    {CATEGORY_LABELS[component.category]}
                  </span>
                  <span className="text-border-strong text-xs" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-xs text-muted">
                    {CONFIDENCE_LABELS[component.confidence]}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span className="text-muted">
                    Radius:{' '}
                    <span className="font-mono text-ink">{component.borderRadius}</span>
                  </span>
                  <span className="text-border-strong" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-muted">
                    Emphasis: <span className="text-ink font-medium">{component.emphasis}</span>
                  </span>
                </div>
              </div>

              <p className="text-[13px] text-muted leading-relaxed">
                {component.visualTreatment}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>
    </PageContainer>
  );
};
