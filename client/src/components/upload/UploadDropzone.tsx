import React, { useRef } from 'react';
import { ImageUp, Loader2, ShieldCheck, Upload } from 'lucide-react';
import { MAX_FILE_SIZE_MB, SUPPORTED_FORMATS, type UploadStatus } from '../../types/upload';
import { PrimaryButton } from '../ui/Buttons';

export interface UploadDropzoneProps {
  status: UploadStatus;
  onChooseFile: () => void;
  onFilesDropped: (files: FileList) => void;
  onDragStateChange: (isDragging: boolean) => void;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  status,
  onChooseFile,
  onFilesDropped,
  onDragStateChange
}) => {
  const dragDepthRef = useRef<number>(0);

  const isDragging = status === 'dragging';
  const isValidating = status === 'validating';

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current += 1;
    if (dragDepthRef.current === 1) {
      onDragStateChange(true);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      onDragStateChange(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = 0;
    onDragStateChange(false);

    if (isValidating) return;
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      onFilesDropped(event.dataTransfer.files);
    }
  };

  return (
    <section
      aria-label="Screenshot upload dropzone"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={[
        'rounded-xl border border-dashed px-6 py-12 sm:px-10 sm:py-16 text-center transition-colors duration-150',
        isDragging
          ? 'bg-accent-soft border-accent'
          : 'bg-surface border-border-strong hover:border-accent/60 hover:bg-surface'
      ].join(' ')}
    >
      <div className="max-w-lg mx-auto flex flex-col items-center">
        <div
          className={[
            'w-12 h-12 rounded-xl border flex items-center justify-center mb-5 transition-colors duration-150',
            isDragging
              ? 'bg-surface border-accent/30 text-accent'
              : 'bg-subtle border-border text-accent'
          ].join(' ')}
        >
          {isValidating ? (
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
          ) : (
            <ImageUp className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
          )}
        </div>

        <h2 className="text-lg sm:text-xl font-semibold tracking-[-0.02em] text-ink text-balance">
          {isValidating
            ? 'Validating screenshot'
            : isDragging
              ? 'Drop screenshot to upload'
              : 'Upload a website screenshot'}
        </h2>

        <p className="mt-2 text-sm text-muted leading-relaxed max-w-md">
          {isValidating
            ? 'Checking format signature, file size, and decoding intrinsic image dimensions.'
            : 'Extract colour palettes, typographic hierarchy, spacing rhythm, and component tokens from any captured interface.'}
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
          <PrimaryButton
            onClick={onChooseFile}
            disabled={isValidating}
            className="w-full sm:w-auto"
          >
            <Upload className="w-4 h-4" aria-hidden="true" />
            <span>Choose screenshot</span>
          </PrimaryButton>
          <span className="text-xs text-muted">
            or drag and drop a file anywhere in this area
          </span>
        </div>

        {/* Supported formats & max file size — unboxed metadata */}
        <div className="mt-8 pt-5 border-t border-border w-full space-y-2.5">
          <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs text-muted">
            <span>Supported formats</span>
            <span className="text-border-strong" aria-hidden="true">·</span>
            <span className="font-mono font-medium text-ink">
              {SUPPORTED_FORMATS.join(' / ')}
            </span>
            <span className="text-border-strong" aria-hidden="true">·</span>
            <span>
              Max size <span className="font-mono font-medium text-ink">{MAX_FILE_SIZE_MB} MB</span>
            </span>
          </div>

          <p className="inline-flex items-center justify-center gap-1.5 text-xs text-muted">
            <ShieldCheck className="w-3.5 h-3.5 text-muted shrink-0" aria-hidden="true" />
            <span>
              Processed locally in your browser memory — never uploaded or permanently stored.
            </span>
          </p>
        </div>
      </div>
    </section>
  );
};
