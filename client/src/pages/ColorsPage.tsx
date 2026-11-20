import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Palette, ScanLine } from 'lucide-react';
import type { UseVisualAnalysisResult } from '../hooks/useVisualAnalysis';
import type { ExtractedColor, PaletteExtractionResult } from '../types/colors';
import type { PageId } from '../types/navigation';
import type { UploadedImage } from '../types/upload';
import { formatFileSize } from '../utils/imageValidation';
import { VisualAnalysisBanner } from '../components/analysis/VisualAnalysisBanner';
import { ColorDetails } from '../components/colors/ColorDetails';
import { ColorPalette } from '../components/colors/ColorPalette';
import { ColorStatistics } from '../components/colors/ColorStatistics';
import { SemanticColorRoles } from '../components/colors/SemanticColorRoles';
import { PrimaryButton, SecondaryButton } from '../components/ui/Buttons';
import { EmptyState } from '../components/ui/EmptyState';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeading } from '../components/ui/PageHeading';
import { SectionCard } from '../components/ui/SectionCard';

export interface ColorsPageProps {
  image: UploadedImage | null;
  result: PaletteExtractionResult | null;
  visualAnalysis: UseVisualAnalysisResult;
  onRunVisualAnalysis: () => void;
  onNavigate: (page: PageId) => void;
}

async function copyTextToClipboard(value: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fallback below for restricted iframe clipboard contexts
    }
  }

  if (typeof document === 'undefined') return false;

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

export const ColorsPage: React.FC<ColorsPageProps> = ({
  image,
  result,
  visualAnalysis,
  onRunVisualAnalysis,
  onNavigate
}) => {
  const [selectedColorId, setSelectedColorId] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showOriginalScreenshot, setShowOriginalScreenshot] = useState<boolean>(true);

  const copyTimerRef = useRef<number | null>(null);

  // Sync default selection to Rank #1 whenever a new palette arrives
  useEffect(() => {
    if (result && result.colors.length > 0) {
      setSelectedColorId(result.colors[0].id);
    } else {
      setSelectedColorId('');
    }
  }, [result]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const triggerCopy = useCallback(async (value: string, key: string) => {
    await copyTextToClipboard(value);
    setCopiedKey(key);
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = window.setTimeout(() => {
      setCopiedKey((current) => (current === key ? null : current));
    }, 1500);
  }, []);

  const handleSelectAndCopy = useCallback(
    (color: ExtractedColor) => {
      setSelectedColorId(color.id);
      void triggerCopy(color.hex, color.id);
    },
    [triggerCopy]
  );

  const handleCopyHex = useCallback(
    (hex: string, colorId: string) => {
      setSelectedColorId(colorId);
      void triggerCopy(hex, colorId);
    },
    [triggerCopy]
  );

  if (!result || !image || result.colors.length === 0) {
    return (
      <PageContainer>
        <PageHeading
          title="Colors"
          description="Measured colour palette extracted from your website screenshot."
        />
        <SectionCard>
          <EmptyState
            icon={Palette}
            title="No colour palette extracted yet"
            description="Upload a website screenshot in New Analysis and click Continue to extract its measured colour palette locally."
            action={
              <PrimaryButton onClick={() => onNavigate('new-analysis')}>
                <ScanLine className="w-4 h-4" aria-hidden="true" />
                <span>Go to New Analysis</span>
              </PrimaryButton>
            }
          />
        </SectionCard>
      </PageContainer>
    );
  }

  const selectedColor =
    result.colors.find((c) => c.id === selectedColorId) ?? result.colors[0];

  const semanticRoles =
    visualAnalysis.status === 'completed' && visualAnalysis.result
      ? visualAnalysis.result.interpretation.semanticColors
      : null;

  return (
    <PageContainer>
      <PageHeading
        title="Colors"
        description={`Measured pixel palette extracted from ${image.name}.`}
        action={
          <SecondaryButton size="sm" onClick={() => onNavigate('new-analysis')}>
            <ScanLine className="w-4 h-4 text-muted" aria-hidden="true" />
            <span>Manage screenshot</span>
          </SecondaryButton>
        }
      />

      {/* Live screen-reader announcement for copy feedback */}
      <div className="sr-only" aria-live="polite">
        {copiedKey ? 'Colour value copied to clipboard.' : ''}
      </div>

      {/* Section A: Overview Statistics (Measured via local Canvas) */}
      <ColorStatistics colors={result.colors} statistics={result.statistics} />

      {/* Sections B & C: Measured Palette Grid + Selected Colour Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7">
          <ColorPalette
            colors={result.colors}
            selectedColorId={selectedColor.id}
            copiedKey={copiedKey}
            onSelectAndCopy={handleSelectAndCopy}
            onCopyHex={handleCopyHex}
          />
        </div>

        <div className="lg:col-span-5 lg:sticky lg:top-20">
          <ColorDetails
            color={selectedColor}
            copiedKey={copiedKey}
            onCopyValue={(value, key) => void triggerCopy(value, key)}
          />
        </div>
      </div>

      {/* Section D: AI Visual Interpretation Trigger & Summary (M5) */}
      <VisualAnalysisBanner
        analysis={visualAnalysis}
        onRunAnalysis={onRunVisualAnalysis}
        onNavigate={onNavigate}
      />

      {/* Section E: AI-Inferred Semantic Colour Roles (distinct from measured pixels above) */}
      {semanticRoles && semanticRoles.length > 0 && (
        <SemanticColorRoles
          roles={semanticRoles}
          copiedKey={copiedKey}
          onCopyHex={(hex, key) => void triggerCopy(hex, key)}
        />
      )}

      {/* Section F: Unmodified Original Screenshot Comparison */}
      <SectionCard
        title="Original Screenshot"
        description={`${image.name} · ${image.format} · ${image.width} × ${image.height} px · ${formatFileSize(image.size)}`}
        action={
          <SecondaryButton
            size="sm"
            onClick={() => setShowOriginalScreenshot((prev) => !prev)}
            aria-expanded={showOriginalScreenshot}
          >
            {showOriginalScreenshot ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
                <span>Hide preview</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
                <span>Show preview</span>
              </>
            )}
          </SecondaryButton>
        }
        bodyClassName={showOriginalScreenshot ? 'p-5 sm:p-6' : 'hidden'}
      >
        <div className="rounded-lg border border-border bg-canvas p-4 flex items-center justify-center min-h-[200px] max-h-[460px] overflow-hidden">
          <img
            src={image.previewUrl}
            alt={`Original unmodified screenshot ${image.name}`}
            className="max-w-full max-h-[420px] w-auto h-auto object-contain rounded border border-border bg-surface"
          />
        </div>
      </SectionCard>
    </PageContainer>
  );
};
