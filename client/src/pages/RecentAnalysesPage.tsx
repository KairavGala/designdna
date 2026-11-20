import React, { useMemo } from 'react';
import { ArrowRight, Braces, History, LayoutGrid, Palette, ScanLine } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from '../components/ui/Buttons';
import { EmptyState } from '../components/ui/EmptyState';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeading } from '../components/ui/PageHeading';
import { SectionCard } from '../components/ui/SectionCard';
import type { UseColorExtractionResult } from '../hooks/useColorExtraction';
import type { UseVisualAnalysisResult } from '../hooks/useVisualAnalysis';
import { deriveDashboardState } from '../services/dashboard/deriveDashboardState';
import type { DesignSystem } from '../types/designSystem';
import type { DesignSystemSectionId, PageId } from '../types/navigation';
import type { UploadedImage } from '../types/upload';
import { formatFileSize } from '../utils/imageValidation';

export interface RecentAnalysesPageProps {
  image: UploadedImage | null;
  colorExtraction: UseColorExtractionResult;
  visualAnalysis: UseVisualAnalysisResult;
  designSystem: DesignSystem | null;
  unlockedSections: ReadonlySet<DesignSystemSectionId>;
  onNavigate: (page: PageId) => void;
}

export const RecentAnalysesPage: React.FC<RecentAnalysesPageProps> = ({
  image,
  colorExtraction,
  visualAnalysis,
  designSystem,
  unlockedSections,
  onNavigate
}) => {
  const dashboard = useMemo(
    () =>
      deriveDashboardState({
        image,
        colorExtraction,
        visualAnalysis,
        designSystem,
        unlockedSections
      }),
    [image, colorExtraction, visualAnalysis, designSystem, unlockedSections]
  );

  return (
    <PageContainer>
      <PageHeading
        title="Recent Analyses"
        description="Active in-memory session record. DesignDNA operates local-first with no persistent history."
        action={
          <PrimaryButton
            size="sm"
            onClick={() => onNavigate('new-analysis')}
            className="w-full sm:w-auto"
          >
            <ScanLine className="w-4 h-4" aria-hidden="true" />
            <span>{image ? 'Replace Screenshot' : 'New Analysis'}</span>
          </PrimaryButton>
        }
      />

      {!image ? (
        <SectionCard>
          <EmptyState
            icon={History}
            title="No analysis in this session"
            description="DesignDNA is local-first and stateless: screenshots and extracted design systems stay in browser memory for the current session only, with no database or saved history."
            action={
              <PrimaryButton onClick={() => onNavigate('new-analysis')}>
                <ScanLine className="w-4 h-4" aria-hidden="true" />
                <span>Start New Analysis</span>
              </PrimaryButton>
            }
          />
        </SectionCard>
      ) : (
        <>
          <SectionCard
            title="Current Session Analysis"
            description="1 active analysis held in browser memory."
            action={
              <span className="text-xs font-mono text-muted tabular-nums">
                {dashboard.unlockedCount} / {dashboard.totalSectionCount} sections ready
              </span>
            }
            bodyClassName="p-0"
          >
            <div className="p-5 sm:p-6 flex flex-col md:flex-row gap-5 items-start">
              <div className="w-full md:w-56 shrink-0 rounded-lg border border-border bg-canvas p-2 flex items-center justify-center aspect-[16/10]">
                <img
                  src={image.previewUrl}
                  alt={`Uploaded screenshot ${image.name}`}
                  className="max-h-full max-w-full w-auto h-auto object-contain rounded-[4px]"
                />
              </div>

              <div className="flex-1 min-w-0 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-ink break-words">
                    {image.name}
                  </h3>
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
                    <span className="font-sans font-medium text-ink">
                      {dashboard.statusLabel}
                    </span>
                  </div>
                </div>

                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-border">
                  <div className="space-y-0.5">
                    <dt className="text-xs text-muted">{dashboard.metrics.colorLabel}</dt>
                    <dd className="text-sm font-semibold font-mono text-ink tabular-nums">
                      {dashboard.metrics.colorCount ?? '—'}
                    </dd>
                  </div>
                  <div className="space-y-0.5">
                    <dt className="text-xs text-muted">Total tokens</dt>
                    <dd className="text-sm font-semibold font-mono text-ink tabular-nums">
                      {dashboard.metrics.totalTokens ?? '—'}
                    </dd>
                  </div>
                  <div className="space-y-0.5">
                    <dt className="text-xs text-muted">Visual AI</dt>
                    <dd className="text-sm font-medium text-ink truncate">
                      {visualAnalysis.status === 'completed' && visualAnalysis.result
                        ? visualAnalysis.result.meta.model
                        : visualAnalysis.status === 'error'
                          ? 'Error'
                          : 'Not run'}
                    </dd>
                  </div>
                  <div className="space-y-0.5">
                    <dt className="text-xs text-muted">Storage</dt>
                    <dd className="text-sm font-medium text-ink">In-memory only</dd>
                  </div>
                </dl>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <PrimaryButton size="sm" onClick={() => onNavigate('overview')}>
                    <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Open Overview</span>
                  </PrimaryButton>
                  {unlockedSections.has('colors') && (
                    <SecondaryButton size="sm" onClick={() => onNavigate('colors')}>
                      <Palette className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
                      <span>Colors</span>
                    </SecondaryButton>
                  )}
                  {unlockedSections.has('design-tokens') && (
                    <SecondaryButton size="sm" onClick={() => onNavigate('design-tokens')}>
                      <Braces className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
                      <span>Design Tokens</span>
                    </SecondaryButton>
                  )}
                  <SecondaryButton size="sm" onClick={() => onNavigate('new-analysis')}>
                    <span>Upload / Replace</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
                  </SecondaryButton>
                </div>
              </div>
            </div>
          </SectionCard>

          <p className="text-xs text-muted leading-relaxed px-1">
            Previous analyses are intentionally not retained across refreshes or sessions. DesignDNA
            does not write screenshots or extracted tokens to a database, localStorage, or
            sessionStorage.
          </p>
        </>
      )}
    </PageContainer>
  );
};
