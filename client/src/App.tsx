import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import type { HeaderSessionContext } from './components/layout/Header';
import { useColorExtraction } from './hooks/useColorExtraction';
import { useImageUpload } from './hooks/useImageUpload';
import { useVisualAnalysis } from './hooks/useVisualAnalysis';
import { ColorsPage } from './pages/ColorsPage';
import { ComponentsPage } from './pages/ComponentsPage';
import { DesignTokensPage } from './pages/DesignTokensPage';
import { EffectsPage } from './pages/EffectsPage';
import { HelpPage } from './pages/HelpPage';
import { LayoutPage } from './pages/LayoutPage';
import { NewAnalysisPage } from './pages/NewAnalysisPage';
import { OverviewPage } from './pages/OverviewPage';
import { RecentAnalysesPage } from './pages/RecentAnalysesPage';
import { SettingsPage } from './pages/SettingsPage';
import { SpacingPage } from './pages/SpacingPage';
import { TypographyPage } from './pages/TypographyPage';
import { VisualInvestigationPage } from './pages/VisualInvestigationPage';
import { normalizeDesignSystem } from './services/designSystem/normalizeDesignSystem';
import type { DesignSystem } from './types/designSystem';
import type { DesignSystemSectionId, PageId } from './types/navigation';

const DESIGN_SYSTEM_PAGES: ReadonlySet<PageId> = new Set([
  'colors',
  'typography',
  'spacing',
  'components',
  'layout',
  'effects',
  'design-tokens'
]);

const AI_INTERPRETATION_SECTIONS: readonly DesignSystemSectionId[] = [
  'typography',
  'spacing',
  'components',
  'layout',
  'effects',
  'design-tokens'
];

export const App: React.FC = () => {
  const [activePage, setActivePage] = useState<PageId>('overview');
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const activePageRef = useRef<PageId>('overview');

  const imageUpload = useImageUpload();
  const colorExtraction = useColorExtraction();
  const visualAnalysis = useVisualAnalysis();

  const handleNavigate = useCallback((page: PageId) => {
    activePageRef.current = page;
    setActivePage(page);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, []);

  // Invalidate previous colour extraction and AI visual interpretation results whenever the active screenshot changes or is removed
  const currentPreviewUrl = imageUpload.image?.previewUrl ?? null;
  const resetExtraction = colorExtraction.reset;
  const resetVisualAnalysis = visualAnalysis.reset;

  useEffect(() => {
    resetExtraction();
    resetVisualAnalysis();
    setSelectedRegionId(null);
    if (!currentPreviewUrl && DESIGN_SYSTEM_PAGES.has(activePageRef.current)) {
      handleNavigate('new-analysis');
    }
  }, [currentPreviewUrl, resetExtraction, resetVisualAnalysis, handleNavigate]);

  const handleStartExtraction = useCallback(async () => {
    resetVisualAnalysis();
    setSelectedRegionId(null);
    const extracted = await colorExtraction.extractFromImage(imageUpload.image);
    // Navigate to Colors only if extraction completed cleanly and the user is still on New Analysis
    if (extracted && activePageRef.current === 'new-analysis') {
      handleNavigate('colors');
    }
  }, [colorExtraction, imageUpload.image, resetVisualAnalysis, handleNavigate]);

  const handleRunVisualAnalysis = useCallback(() => {
    setSelectedRegionId(null);
    void visualAnalysis.runAnalysis(imageUpload.image, colorExtraction.result);
  }, [visualAnalysis, imageUpload.image, colorExtraction.result]);

  const designSystem = useMemo<DesignSystem | null>(() => {
    if (
      !imageUpload.image ||
      colorExtraction.status !== 'completed' ||
      !colorExtraction.result ||
      colorExtraction.result.colors.length === 0 ||
      visualAnalysis.status !== 'completed' ||
      !visualAnalysis.result
    ) {
      return null;
    }

    try {
      return normalizeDesignSystem({
        sourceImage: {
          name: imageUpload.image.name,
          format: imageUpload.image.format,
          width: imageUpload.image.width,
          height: imageUpload.image.height
        },
        colorResult: colorExtraction.result,
        visualAnalysis: visualAnalysis.result
      });
    } catch (error) {
      console.error('Failed to normalise design system tokens:', error);
      return null;
    }
  }, [
    imageUpload.image,
    colorExtraction.status,
    colorExtraction.result,
    visualAnalysis.status,
    visualAnalysis.result
  ]);

  const unlockedSections = useMemo<ReadonlySet<DesignSystemSectionId>>(() => {
    const set = new Set<DesignSystemSectionId>();
    const hasColors = Boolean(
      imageUpload.image &&
        colorExtraction.status === 'completed' &&
        colorExtraction.result &&
        colorExtraction.result.colors.length > 0
    );

    if (hasColors) {
      set.add('colors');
    }

    if (hasColors && visualAnalysis.status === 'completed' && visualAnalysis.result) {
      for (const section of AI_INTERPRETATION_SECTIONS) {
        if (section === 'design-tokens' && !designSystem) continue;
        set.add(section);
      }
    }

    return set;
  }, [
    imageUpload.image,
    colorExtraction.status,
    colorExtraction.result,
    visualAnalysis.status,
    visualAnalysis.result,
    designSystem
  ]);

  const headerSessionContext = useMemo<HeaderSessionContext | null>(() => {
    if (!imageUpload.image) return null;

    let statusLabel = 'Screenshot uploaded';
    if (colorExtraction.status === 'loading' || colorExtraction.status === 'processing') {
      statusLabel = 'Extracting colours';
    } else if (visualAnalysis.status === 'preparing' || visualAnalysis.status === 'analyzing') {
      statusLabel = 'Analysing visuals';
    } else if (designSystem && visualAnalysis.status === 'completed') {
      statusLabel = `${designSystem.metrics.totalTokens} tokens ready`;
    } else if (colorExtraction.status === 'completed' && colorExtraction.result) {
      statusLabel = `${colorExtraction.result.colors.length} colours measured`;
    }

    return {
      fileName: imageUpload.image.name,
      statusLabel,
      unlockedCount: unlockedSections.size
    };
  }, [
    imageUpload.image,
    colorExtraction.status,
    colorExtraction.result,
    visualAnalysis.status,
    designSystem,
    unlockedSections
  ]);

  const renderPage = () => {
    switch (activePage) {
      case 'overview':
        return (
          <OverviewPage
            image={imageUpload.image}
            colorExtraction={colorExtraction}
            visualAnalysis={visualAnalysis}
            designSystem={designSystem}
            unlockedSections={unlockedSections}
            onStartExtraction={handleStartExtraction}
            onRunVisualAnalysis={handleRunVisualAnalysis}
            onNavigate={handleNavigate}
          />
        );
      case 'visual-investigation':
        return (
          <VisualInvestigationPage
            image={imageUpload.image}
            colorExtraction={colorExtraction}
            visualAnalysis={visualAnalysis}
            selectedRegionId={selectedRegionId}
            onSelectRegion={setSelectedRegionId}
            onStartExtraction={handleStartExtraction}
            onRunVisualAnalysis={handleRunVisualAnalysis}
            onNavigate={handleNavigate}
          />
        );
      case 'new-analysis':
        return (
          <NewAnalysisPage
            onNavigate={handleNavigate}
            upload={imageUpload}
            extraction={colorExtraction}
            onStartExtraction={handleStartExtraction}
          />
        );
      case 'recent-analyses':
        return (
          <RecentAnalysesPage
            image={imageUpload.image}
            colorExtraction={colorExtraction}
            visualAnalysis={visualAnalysis}
            designSystem={designSystem}
            unlockedSections={unlockedSections}
            onNavigate={handleNavigate}
          />
        );
      case 'colors':
        return (
          <ColorsPage
            image={imageUpload.image}
            result={colorExtraction.result}
            visualAnalysis={visualAnalysis}
            onRunVisualAnalysis={handleRunVisualAnalysis}
            onNavigate={handleNavigate}
          />
        );
      case 'typography':
        return (
          <TypographyPage
            image={imageUpload.image}
            analysisResult={visualAnalysis.result}
            onNavigate={handleNavigate}
          />
        );
      case 'spacing':
        return (
          <SpacingPage
            image={imageUpload.image}
            analysisResult={visualAnalysis.result}
            onNavigate={handleNavigate}
          />
        );
      case 'components':
        return (
          <ComponentsPage
            image={imageUpload.image}
            analysisResult={visualAnalysis.result}
            onNavigate={handleNavigate}
          />
        );
      case 'layout':
        return (
          <LayoutPage
            image={imageUpload.image}
            analysisResult={visualAnalysis.result}
            onNavigate={handleNavigate}
          />
        );
      case 'effects':
        return (
          <EffectsPage
            image={imageUpload.image}
            analysisResult={visualAnalysis.result}
            onNavigate={handleNavigate}
          />
        );
      case 'design-tokens':
        return (
          <DesignTokensPage
            image={imageUpload.image}
            designSystem={designSystem}
            onNavigate={handleNavigate}
          />
        );
      case 'settings':
        return <SettingsPage />;
      case 'help':
        return <HelpPage onNavigate={handleNavigate} />;
    }
  };

  return (
    <AppShell
      activePage={activePage}
      onNavigate={handleNavigate}
      unlockedSections={unlockedSections}
      sessionContext={headerSessionContext}
    >
      {renderPage()}
    </AppShell>
  );
};

export default App;
