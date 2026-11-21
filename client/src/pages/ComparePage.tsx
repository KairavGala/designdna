import React, { useMemo } from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { ColorCompareSection } from '../components/comparison/ColorCompareSection';
import { CompareSlotManager } from '../components/comparison/CompareSlotManager';
import { ComponentsMotifsCompareSection } from '../components/comparison/ComponentsMotifsCompareSection';
import { DifferenceIntelligencePanel } from '../components/comparison/DifferenceIntelligencePanel';
import { RefinementInsightsPanel } from '../components/comparison/RefinementInsightsPanel';
import { ScreenshotCompareViewer } from '../components/comparison/ScreenshotCompareViewer';
import { TypographyCompareSection } from '../components/comparison/TypographyCompareSection';
import { VisualIdentityCompareMatrix } from '../components/comparison/VisualIdentityCompareMatrix';
import { SecondaryButton } from '../components/ui/Buttons';
import { PageContainer } from '../components/ui/PageContainer';
import type { UseComparisonSlotResult } from '../hooks/useComparisonSlot';
import { buildDesignComparison } from '../services/comparison/buildDesignComparison';
import type { AnalysisContextSnapshot } from '../types/comparison';
import type { PageId } from '../types/navigation';

export interface ComparePageProps {
  designA: AnalysisContextSnapshot;
  designB: AnalysisContextSnapshot;
  slotAController: UseComparisonSlotResult;
  slotBController: UseComparisonSlotResult;
  mainSessionAvailable: boolean;
  mainSessionFileName: string | null;
  mainSessionReadiness: AnalysisContextSnapshot['readiness'];
  slotASource: 'main-session' | 'independent';
  onLinkSlotAToMain: () => void;
  onSelectFileA: (files: FileList | File[] | null) => Promise<void>;
  onClearSlotA: () => void;
  onClearComparison: () => void;
  onExtractMainColors: () => Promise<void>;
  onRunMainVisualAnalysis: () => void;
  onRunMainFullAnalysis: () => Promise<void>;
  onNavigate: (page: PageId) => void;
}

export const ComparePage: React.FC<ComparePageProps> = ({
  designA,
  designB,
  slotAController,
  slotBController,
  mainSessionAvailable,
  mainSessionFileName,
  mainSessionReadiness,
  slotASource,
  onLinkSlotAToMain,
  onSelectFileA,
  onClearSlotA,
  onClearComparison,
  onExtractMainColors,
  onRunMainVisualAnalysis,
  onRunMainFullAnalysis,
  onNavigate
}) => {
  const comparison = useMemo(
    () => buildDesignComparison(designA, designB),
    [designA, designB]
  );

  const hasAnyLoaded = Boolean(designA.image || designB.image);

  const handleClearAndReturn = () => {
    onClearComparison();
    onNavigate('overview');
  };

  return (
    <PageContainer className="space-y-6">
      {/* Masthead */}
      <header className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-border">
        <div className="space-y-1.5 max-w-2xl">
          <p className="text-xs font-mono text-accent">Visual DNA Comparison</p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink text-balance">
            Compare two designs. Understand what makes them different.
          </h1>
          <p className="text-sm text-muted leading-relaxed">{comparison.readinessSummary}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {hasAnyLoaded && (
            <SecondaryButton
              size="sm"
              onClick={onClearComparison}
              data-compare-clear-all
              disabled={designA.isBusy || designB.isBusy}
              className="whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
              <span>Clear Comparison</span>
            </SecondaryButton>
          )}
          <SecondaryButton
            size="sm"
            onClick={handleClearAndReturn}
            data-compare-return-workflow
            disabled={designA.isBusy || designB.isBusy}
            className="whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
            <span>Return to Overview</span>
          </SecondaryButton>
        </div>
      </header>

      {/* Independent Slot Control Deck (Design A & Design B) */}
      <CompareSlotManager
        designA={designA}
        designB={designB}
        slotAController={slotAController}
        slotBController={slotBController}
        mainSessionAvailable={mainSessionAvailable}
        mainSessionFileName={mainSessionFileName}
        mainSessionReadiness={mainSessionReadiness}
        slotASource={slotASource}
        onLinkSlotAToMain={onLinkSlotAToMain}
        onSelectFileA={onSelectFileA}
        onClearSlotA={onClearSlotA}
        onExtractMainColors={onExtractMainColors}
        onRunMainVisualAnalysis={onRunMainVisualAnalysis}
        onRunMainFullAnalysis={onRunMainFullAnalysis}
      />

      {/* Side-by-Side Comparison Workspace (shown as soon as at least one screenshot is loaded) */}
      {hasAnyLoaded && (
        <div className="space-y-6">
          {/* 01. Side-by-Side Screenshot Viewer */}
          <ScreenshotCompareViewer
            designA={designA}
            designB={designB}
            geometry={comparison.geometry}
          />

          {/* 02. Difference Intelligence */}
          <DifferenceIntelligencePanel intelligence={comparison.differenceIntelligence} />

          {/* 03. 9-Dimension Visual Identity Comparison */}
          <VisualIdentityCompareMatrix rows={comparison.visualIdentityRows} />

          {/* 04. Measured Colour Comparison */}
          <ColorCompareSection colorComparison={comparison.colorComparison} />

          {/* 05. Typography Comparison */}
          <TypographyCompareSection typography={comparison.typographyComparison} />

          {/* 06. Components, Motifs & Visual Crops */}
          <ComponentsMotifsCompareSection comparison={comparison.componentsMotifs} />

          {/* 07. Refinement Insights */}
          <RefinementInsightsPanel
            insights={comparison.refinementInsights}
            canCompareMeasured={comparison.canCompareMeasured}
          />

          {/* Honest Screenshot-Only Methodology Footer */}
          <p className="text-xs text-faint leading-relaxed pt-2 border-t border-border/60">
            Comparison integrity: Measured values reflect exact pixel quantization from each uploaded screenshot. AI-inferred classifications and derived comparison notes come strictly from visual screenshot analysis without live HTML, CSS, DOM, or webfont file inspection. All comparison state lives in browser memory only.
          </p>
        </div>
      )}
    </PageContainer>
  );
};
