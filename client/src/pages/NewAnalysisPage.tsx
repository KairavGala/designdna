import React, { useEffect, useRef } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, Palette, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import {
  EXTRACTION_STAGE_LABELS,
  type UseColorExtractionResult
} from '../hooks/useColorExtraction';
import type { UseImageUploadResult } from '../hooks/useImageUpload';
import { DESIGN_SYSTEM_NAV_ITEMS, type PageId } from '../types/navigation';
import { FILE_INPUT_ACCEPT } from '../types/upload';
import { PrimaryButton, SecondaryButton } from '../components/ui/Buttons';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeading } from '../components/ui/PageHeading';
import { SectionCard } from '../components/ui/SectionCard';
import { StatusIndicator } from '../components/ui/StatusIndicator';
import { ImageMetadata } from '../components/upload/ImageMetadata';
import { ImagePreview } from '../components/upload/ImagePreview';
import { UploadActions } from '../components/upload/UploadActions';
import { UploadDropzone } from '../components/upload/UploadDropzone';
import { UploadError } from '../components/upload/UploadError';

export interface NewAnalysisPageProps {
  onNavigate: (page: PageId) => void;
  upload: UseImageUploadResult;
  extraction: UseColorExtractionResult;
  onStartExtraction: () => Promise<void>;
}

export const NewAnalysisPage: React.FC<NewAnalysisPageProps> = ({
  onNavigate,
  upload,
  extraction,
  onStartExtraction
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Prevent browser navigation if a file is accidentally dropped outside the dropzone
  useEffect(() => {
    const preventWindowDrop = (event: DragEvent) => {
      event.preventDefault();
    };

    window.addEventListener('dragover', preventWindowDrop);
    window.addEventListener('drop', preventWindowDrop);
    return () => {
      window.removeEventListener('dragover', preventWindowDrop);
      window.removeEventListener('drop', preventWindowDrop);
    };
  }, []);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target;
    void upload.handleFiles(files);
    // Reset input value so selecting the same file again fires onChange
    event.target.value = '';
  };

  const handleFilesDropped = (files: FileList) => {
    void upload.handleFiles(files);
  };

  const isExtracting =
    extraction.status === 'loading' || extraction.status === 'processing';
  const hasExtractedColors =
    extraction.status === 'completed' && Boolean(extraction.result);

  return (
    <PageContainer>
      <PageHeading
        title="New Analysis"
        description={
          hasExtractedColors && upload.image
            ? 'Measured colours have been extracted for this screenshot. Inspect them in Colors or replace the image.'
            : 'Upload a website screenshot to inspect its visual language and extract its measured colour palette.'
        }
        action={
          <SecondaryButton size="sm" onClick={() => onNavigate('overview')}>
            <ArrowLeft className="w-4 h-4 text-muted" aria-hidden="true" />
            <span>Back to Overview</span>
          </SecondaryButton>
        }
      />

      {/* Hidden single-file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={FILE_INPUT_ACCEPT}
        onChange={handleFileInputChange}
        className="sr-only"
        aria-label="Choose website screenshot"
      />

      {/* Recoverable upload validation error banner */}
      {upload.error && (
        <UploadError
          error={upload.error}
          retainedPreviousImage={Boolean(upload.image)}
          onDismiss={upload.dismissError}
        />
      )}

      {/* Recoverable image-processing error banner */}
      {extraction.status === 'error' && extraction.error && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-[#F87171]/10 border border-[#F87171]/30 rounded-xl px-4 py-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div className="flex items-start gap-3 min-w-0">
            <AlertCircle
              className="w-4 h-4 text-[#F87171] shrink-0 mt-0.5"
              strokeWidth={2}
              aria-hidden="true"
            />
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-semibold text-[#FCA5A5]">
                {extraction.error.title}
              </p>
              <p className="text-[13px] text-[#FECACA]/85 leading-relaxed">
                {extraction.error.message}
              </p>
            </div>
          </div>

          {upload.image && (
            <SecondaryButton
              size="sm"
              onClick={() => void onStartExtraction()}
              className="shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
              <span>Retry</span>
            </SecondaryButton>
          )}
        </div>
      )}

      {/* Stage 1: Empty / Dragging / Validating (no image yet) */}
      {!upload.image && (
        <>
          <UploadDropzone
            status={upload.status}
            onChooseFile={openFilePicker}
            onFilesDropped={handleFilesDropped}
            onDragStateChange={upload.setDragging}
          />

          <SectionCard
            title="Sections unlocked after analysis"
            description="Local pixel extraction unlocks Colors immediately; AI Visual Interpretation unlocks Typography, Spacing, Components, Layout, Effects, and normalised Design Tokens."
            bodyClassName="p-0"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0">
              {DESIGN_SYSTEM_NAV_ITEMS.map((section, index) => {
                const Icon = section.icon;
                const isSecondColumn = index % 2 === 1;
                const hasTopBorder = index >= 2;
                return (
                  <div
                    key={section.id}
                    className={[
                      'p-5 flex items-start gap-3.5',
                      isSecondColumn ? 'sm:border-l sm:border-border' : '',
                      hasTopBorder ? 'sm:border-t sm:border-border' : ''
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <Icon
                      className="w-4 h-4 text-muted shrink-0 mt-0.5"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 space-y-0.5">
                      <h3 className="text-sm font-medium text-ink">{section.label}</h3>
                      <p className="text-[13px] text-muted leading-relaxed">
                        {section.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </>
      )}

      {/* Stage 2: Validated Screenshot Preview, Extraction Status & Actions */}
      {upload.image && (
        <SectionCard
          title="Screenshot Preview"
          description="Verify your captured interface, then click Continue to run local deterministic colour extraction."
        >
          <div className="space-y-6">
            <ImagePreview
              image={upload.image}
              status={upload.status}
              onFilesDropped={handleFilesDropped}
              onDragStateChange={upload.setDragging}
            />

            {/* Real stage-based processing status */}
            {isExtracting && extraction.stage && (
              <div
                aria-live="polite"
                className="rounded-lg border border-border bg-canvas px-4 py-3 flex items-center justify-between gap-3"
              >
                <StatusIndicator
                  variant="loading"
                  label="Processing screenshot locally"
                  detail={EXTRACTION_STAGE_LABELS[extraction.stage]}
                />
              </div>
            )}

            {/* Completed status banner when returning to New Analysis with an already-extracted screenshot */}
            {hasExtractedColors && extraction.result && (
              <div className="rounded-lg border border-border bg-canvas px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <StatusIndicator
                  variant="healthy"
                  label={`${extraction.result.colors.length} measured colours extracted`}
                  detail={`${extraction.result.statistics.sampledPixels.toLocaleString()} pixels sampled in ${extraction.result.statistics.durationMs} ms`}
                />
                <PrimaryButton
                  size="sm"
                  onClick={() => onNavigate('colors')}
                  className="w-full sm:w-auto"
                >
                  <Palette className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Open Colors</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </PrimaryButton>
              </div>
            )}

            <div className="pt-5 border-t border-border space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[13px] font-semibold text-ink">Image Details</h3>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Processed locally in browser memory</span>
                </span>
              </div>

              <ImageMetadata image={upload.image} />
            </div>

            {hasExtractedColors ? (
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-5 border-t border-border">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <SecondaryButton
                    size="sm"
                    onClick={openFilePicker}
                    disabled={upload.status === 'validating'}
                    className="w-full sm:w-auto"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
                    <span>Replace image</span>
                  </SecondaryButton>
                  <SecondaryButton
                    size="sm"
                    onClick={upload.removeImage}
                    disabled={upload.status === 'validating'}
                    className="w-full sm:w-auto text-[#FCA5A5] hover:text-[#FECACA] hover:border-[#F87171]/40 hover:bg-[#F87171]/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Remove</span>
                  </SecondaryButton>
                </div>

                <PrimaryButton
                  onClick={() => onNavigate('colors')}
                  className="w-full sm:w-auto"
                >
                  <span>View Extracted Colors</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </PrimaryButton>
              </div>
            ) : (
              <UploadActions
                disabled={upload.status === 'validating' || isExtracting}
                onReplace={openFilePicker}
                onRemove={upload.removeImage}
                onContinue={() => void onStartExtraction()}
              />
            )}
          </div>
        </SectionCard>
      )}
    </PageContainer>
  );
};
