import React from 'react';
import { ArrowRight, RefreshCw, Trash2 } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from '../ui/Buttons';

export interface UploadActionsProps {
  disabled?: boolean;
  onReplace: () => void;
  onRemove: () => void;
  onContinue: () => void;
}

export const UploadActions: React.FC<UploadActionsProps> = ({
  disabled = false,
  onReplace,
  onRemove,
  onContinue
}) => {
  return (
    <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-5 border-t border-border">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <SecondaryButton
          size="sm"
          onClick={onReplace}
          disabled={disabled}
          className="w-full sm:w-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
          <span>Replace image</span>
        </SecondaryButton>

        <SecondaryButton
          size="sm"
          onClick={onRemove}
          disabled={disabled}
          className="w-full sm:w-auto text-[#FCA5A5] hover:text-[#FECACA] hover:border-[#F87171]/40 hover:bg-[#F87171]/10"
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Remove</span>
        </SecondaryButton>
      </div>

      <PrimaryButton
        onClick={onContinue}
        disabled={disabled}
        className="w-full sm:w-auto"
      >
        <span>Continue</span>
        <ArrowRight className="w-4 h-4" aria-hidden="true" />
      </PrimaryButton>
    </div>
  );
};
