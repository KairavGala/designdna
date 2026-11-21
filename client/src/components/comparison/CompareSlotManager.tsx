import React, { useRef } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ImagePlus,
  Layers,
  Loader2,
  Palette,
  RefreshCw,
  Trash2,
  Wand2
} from 'lucide-react';
import { PrimaryButton, SecondaryButton } from '../ui/Buttons';
import { EXTRACTION_STAGE_LABELS } from '../../hooks/useColorExtraction';
import { VISUAL_ANALYSIS_STAGE_LABELS } from '../../hooks/useVisualAnalysis';
import type { UseComparisonSlotResult } from '../../hooks/useComparisonSlot';
import type { AnalysisContextSnapshot } from '../../types/comparison';

export interface CompareSlotManagerProps {
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
  onExtractMainColors: () => Promise<void>;
  onRunMainVisualAnalysis: () => void;
  onRunMainFullAnalysis: () => Promise<void>;
}

const READINESS_META: Record<
  AnalysisContextSnapshot['readiness'],
  { label: string; toneClass: string }
> = {
  empty: { label: 'Empty slot', toneClass: 'text-faint' },
  uploaded: { label: 'Screenshot loaded · Not analysed', toneClass: 'text-[#FBBF24]' },
  'measured-only': { label: 'Partial · Measured colours ready', toneClass: 'text-[#FBBF24]' },
  complete: { label: 'Full visual DNA ready', toneClass: 'text-accent' }
};

interface SingleSlotCardProps {
  snapshot: AnalysisContextSnapshot;
  controller: UseComparisonSlotResult;
  isMainLinked: boolean;
  canLinkMain: boolean;
  mainSessionFileName: string | null;
  onLinkMain?: () => void;
  onSelectFile: (files: FileList | File[] | null) => Promise<void>;
  onClear: () => void;
  onExtractColors: () => Promise<void>;
  onRunVisualOnly: () => Promise<void> | void;
  onRunFull: () => Promise<void>;
}

const SingleSlotCard: React.FC<SingleSlotCardProps> = ({
  snapshot,
  controller,
  isMainLinked,
  canLinkMain,
  mainSessionFileName,
  onLinkMain,
  onSelectFile,
  onClear,
  onExtractColors,
  onRunVisualOnly,
  onRunFull
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const readinessMeta = READINESS_META[snapshot.readiness];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    void onSelectFile(files);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void onSelectFile(e.dataTransfer.files);
    }
  };

  // Determine honest live status text for independent slot processing
  let progressMessage: string | null = null;
  if (!isMainLinked) {
    if (controller.upload.status === 'validating') {
      progressMessage = 'Validating image dimensions and format…';
    } else if (
      (controller.colorExtraction.status === 'loading' ||
        controller.colorExtraction.status === 'processing') &&
      controller.colorExtraction.stage
    ) {
      progressMessage = EXTRACTION_STAGE_LABELS[controller.colorExtraction.stage];
    } else if (
      (controller.visualAnalysis.status === 'preparing' ||
        controller.visualAnalysis.status === 'analyzing') &&
      controller.visualAnalysis.stage
    ) {
      progressMessage = VISUAL_ANALYSIS_STAGE_LABELS[controller.visualAnalysis.stage];
    } else if (controller.investigation.samplingAssets) {
      progressMessage = 'Extracting real region and component PNG crops…';
    }
  } else if (snapshot.isBusy) {
    progressMessage = 'Processing active main analysis session…';
  }

  const slotError = !isMainLinked
    ? controller.upload.error?.message ??
      controller.colorExtraction.error?.message ??
      controller.visualAnalysis.error?.message ??
      null
    : null;

  const slotTestId = snapshot.slotId;

  return (
    <section
      data-compare-slot={slotTestId}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="rounded-xl border border-border bg-surface p-5 flex flex-col justify-between gap-4 min-w-0"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        data-compare-file-input={slotTestId}
        onChange={handleFileChange}
        aria-label={`Upload screenshot for ${snapshot.slotLabel}`}
      />

      {/* Slot Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-semibold text-ink">{snapshot.slotLabel}</span>
            <span className="text-border-strong" aria-hidden="true">
              ·
            </span>
            <span className={`text-xs font-medium ${readinessMeta.toneClass}`}>
              {readinessMeta.label}
            </span>
          </div>
          <p className="text-xs text-muted">
            {isMainLinked
              ? 'Read-only link to your active analysis session — replacing here will not overwrite your main workspace.'
              : 'Independent comparison session in memory — isolated from your main workspace.'}
          </p>
        </div>

        {snapshot.image && (
          <div className="flex items-center gap-1.5 shrink-0">
            <SecondaryButton
              size="sm"
              disabled={snapshot.isBusy}
              onClick={() => inputRef.current?.click()}
              data-compare-replace={slotTestId}
              className="whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
              <span>Replace</span>
            </SecondaryButton>
            <SecondaryButton
              size="sm"
              disabled={snapshot.isBusy}
              onClick={onClear}
              data-compare-clear-slot={slotTestId}
              className="whitespace-nowrap"
              title={`Clear ${snapshot.slotLabel}`}
            >
              <Trash2 className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
              <span>Clear</span>
            </SecondaryButton>
          </div>
        )}
      </div>

      {/* Slot Content: Empty Dropzone OR Loaded Screenshot Summary */}
      {!snapshot.image ? (
        <div className="rounded-lg border border-dashed border-border-strong bg-canvas/70 p-5 flex flex-col items-center justify-center text-center gap-3 min-h-[146px]">
          <div className="w-10 h-10 rounded-lg border border-border bg-surface flex items-center justify-center text-accent">
            <ImagePlus className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="space-y-1 max-w-sm">
            <p className="text-sm font-medium text-ink">Add screenshot for {snapshot.slotLabel}</p>
            <p className="text-xs text-muted">
              Drop a PNG, JPG, or WEBP screenshot here, or choose a file from your device.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {canLinkMain && onLinkMain && (
              <PrimaryButton
                size="sm"
                onClick={onLinkMain}
                data-compare-use-current={slotTestId}
                className="whitespace-nowrap"
              >
                <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="truncate max-w-[200px]">
                  Use Current ({mainSessionFileName})
                </span>
              </PrimaryButton>
            )}
            <SecondaryButton
              size="sm"
              onClick={() => inputRef.current?.click()}
              data-compare-upload={slotTestId}
              className="whitespace-nowrap"
            >
              <ImagePlus className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
              <span>Upload Screenshot</span>
            </SecondaryButton>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3.5 rounded-lg border border-border bg-canvas/70 p-3">
            <div className="w-20 h-14 rounded border border-border bg-canvas overflow-hidden shrink-0 flex items-center justify-center">
              <img
                src={snapshot.image.previewUrl}
                alt={`${snapshot.slotLabel} preview — ${snapshot.image.name}`}
                className="w-full h-full object-cover object-top"
              />
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <p
                className="text-sm font-medium text-ink truncate"
                title={snapshot.image.name}
                data-compare-filename={slotTestId}
              >
                {snapshot.image.name}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono tabular-nums text-muted">
                <span>
                  {snapshot.image.width} × {snapshot.image.height} px
                </span>
                <span className="text-border-strong" aria-hidden="true">
                  ·
                </span>
                <span>{snapshot.image.format}</span>
                {snapshot.colorResult && (
                  <>
                    <span className="text-border-strong" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-ink/90">
                      {snapshot.colorResult.colors.length} colours
                    </span>
                  </>
                )}
                {snapshot.designSystem && snapshot.visualAnalysis && (
                  <>
                    <span className="text-border-strong" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-accent">
                      {snapshot.designSystem.metrics.totalTokens} tokens
                    </span>
                  </>
                )}
              </div>

              {/* Mini measured palette bar if extracted */}
              {snapshot.colorResult && snapshot.colorResult.colors.length > 0 && (
                <div className="flex h-1.5 w-full overflow-hidden rounded-sm bg-border/60 mt-1.5">
                  {snapshot.colorResult.colors.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        width: `${Math.max(4, c.percentage)}%`,
                        backgroundColor: c.hex
                      }}
                      title={`${c.hex} (${c.percentage}%)`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Progress or Error feedback */}
          {progressMessage && (
            <div
              role="status"
              className="flex items-center gap-2 text-xs text-accent bg-accent/5 border border-accent/25 rounded-lg px-3 py-2"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" aria-hidden="true" />
              <span>{progressMessage}</span>
            </div>
          )}

          {slotError && (
            <div
              role="alert"
              className="flex items-start gap-2 text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{slotError}</span>
            </div>
          )}

          {/* Pipeline Action Controls — never auto-runs */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {snapshot.readiness === 'complete' ? (
              <div className="flex items-center gap-2 text-xs text-accent">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>
                  Analysed with {snapshot.visualAnalysis?.meta.model ?? 'Gemini'} ·{' '}
                  {snapshot.regions.length} regions · {snapshot.elements.length} elements
                </span>
              </div>
            ) : snapshot.readiness === 'measured-only' ? (
              <div className="flex flex-wrap items-center gap-2 w-full justify-between">
                <span className="text-xs text-muted">
                  Measured palette extracted. Run AI analysis for full DNA comparison.
                </span>
                <PrimaryButton
                  size="sm"
                  disabled={snapshot.isBusy}
                  onClick={() => void onRunVisualOnly()}
                  data-compare-run-ai={slotTestId}
                  className="whitespace-nowrap"
                >
                  <Wand2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Run AI Analysis</span>
                </PrimaryButton>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 w-full justify-end">
                <SecondaryButton
                  size="sm"
                  disabled={snapshot.isBusy}
                  onClick={() => void onExtractColors()}
                  data-compare-extract-colors={slotTestId}
                  className="whitespace-nowrap"
                >
                  <Palette className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
                  <span>Extract Colours Only</span>
                </SecondaryButton>
                <PrimaryButton
                  size="sm"
                  disabled={snapshot.isBusy}
                  onClick={() => void onRunFull()}
                  data-compare-analyze-full={slotTestId}
                  className="whitespace-nowrap"
                >
                  <Wand2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Analyse {snapshot.slotLabel}</span>
                </PrimaryButton>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export const CompareSlotManager: React.FC<CompareSlotManagerProps> = ({
  designA,
  designB,
  slotAController,
  slotBController,
  mainSessionAvailable,
  mainSessionFileName,
  slotASource,
  onLinkSlotAToMain,
  onSelectFileA,
  onClearSlotA,
  onExtractMainColors,
  onRunMainVisualAnalysis,
  onRunMainFullAnalysis
}) => {
  const isALinked = slotASource === 'main-session';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
      <SingleSlotCard
        snapshot={designA}
        controller={slotAController}
        isMainLinked={isALinked}
        canLinkMain={!isALinked && mainSessionAvailable}
        mainSessionFileName={mainSessionFileName}
        onLinkMain={onLinkSlotAToMain}
        onSelectFile={onSelectFileA}
        onClear={onClearSlotA}
        onExtractColors={
          isALinked ? onExtractMainColors : slotAController.extractColorsOnly
        }
        onRunVisualOnly={
          isALinked ? onRunMainVisualAnalysis : slotAController.runVisualAnalysisOnly
        }
        onRunFull={
          isALinked ? onRunMainFullAnalysis : slotAController.runFullAnalysis
        }
      />

      <SingleSlotCard
        snapshot={designB}
        controller={slotBController}
        isMainLinked={false}
        canLinkMain={false}
        mainSessionFileName={null}
        onSelectFile={slotBController.selectFile}
        onClear={slotBController.clearSlot}
        onExtractColors={slotBController.extractColorsOnly}
        onRunVisualOnly={slotBController.runVisualAnalysisOnly}
        onRunFull={slotBController.runFullAnalysis}
      />
    </div>
  );
};
