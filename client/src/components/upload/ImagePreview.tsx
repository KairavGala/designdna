import React, { useRef } from 'react';
import { Loader2 } from 'lucide-react';
import type { UploadedImage, UploadStatus } from '../../types/upload';

export interface ImagePreviewProps {
  image: UploadedImage;
  status: UploadStatus;
  onFilesDropped: (files: FileList) => void;
  onDragStateChange: (isDragging: boolean) => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  image,
  status,
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
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={[
        'relative rounded-lg border bg-canvas p-4 sm:p-6 flex items-center justify-center overflow-hidden transition-colors duration-150',
        'min-h-[240px] sm:min-h-[320px] max-h-[480px]',
        isDragging ? 'border-dashed border-accent bg-accent-soft/60' : 'border-border'
      ].join(' ')}
    >
      <img
        src={image.previewUrl}
        alt={`Preview of uploaded screenshot ${image.name}`}
        className="max-w-full max-h-[430px] w-auto h-auto object-contain rounded border border-border bg-surface"
      />

      {isDragging && (
        <div
          aria-live="polite"
          className="absolute inset-0 bg-surface/90 backdrop-blur-[1px] flex items-center justify-center p-4"
        >
          <p className="text-sm font-medium text-accent">
            Drop to replace current screenshot
          </p>
        </div>
      )}

      {isValidating && (
        <div
          aria-live="polite"
          className="absolute inset-0 bg-surface/85 backdrop-blur-[1px] flex items-center justify-center gap-2.5 p-4"
        >
          <Loader2 className="w-4 h-4 text-accent animate-spin" aria-hidden="true" />
          <p className="text-sm font-medium text-ink">Validating replacement screenshot…</p>
        </div>
      )}
    </div>
  );
};
