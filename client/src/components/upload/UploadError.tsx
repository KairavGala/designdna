import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import type { UploadError as UploadErrorData } from '../../types/upload';

export interface UploadErrorProps {
  error: UploadErrorData;
  retainedPreviousImage?: boolean;
  onDismiss: () => void;
}

export const UploadError: React.FC<UploadErrorProps> = ({
  error,
  retainedPreviousImage = false,
  onDismiss
}) => {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="bg-[#F87171]/10 border border-[#F87171]/30 rounded-xl px-4 py-3.5 sm:px-5 flex items-start justify-between gap-3"
    >
      <div className="flex items-start gap-3 min-w-0">
        <AlertCircle
          className="w-4 h-4 text-[#F87171] shrink-0 mt-0.5"
          strokeWidth={2}
          aria-hidden="true"
        />
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="text-sm font-semibold text-[#FCA5A5]">{error.title}</p>
            {error.fileName && (
              <span className="text-xs font-mono text-[#F87171] truncate max-w-[260px]">
                {error.fileName}
              </span>
            )}
          </div>
          <p className="text-[13px] text-[#FECACA]/85 leading-relaxed">
            {error.message}
            {retainedPreviousImage ? ' Your previous screenshot has been kept.' : ''}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss error"
        className="w-8 h-8 -mr-1 -mt-1 rounded-lg flex items-center justify-center text-[#FCA5A5]/75 hover:text-[#FECACA] hover:bg-[#F87171]/15 transition-colors shrink-0 cursor-pointer"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
};
