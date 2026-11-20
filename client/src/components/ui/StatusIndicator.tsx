import React from 'react';
import { AlertCircle, CheckCircle2, Info, Loader2 } from 'lucide-react';

export type StatusVariant = 'healthy' | 'loading' | 'error' | 'neutral';

export interface StatusIndicatorProps {
  variant: StatusVariant;
  label: string;
  detail?: string;
}

const VARIANT_CONFIG: Record<
  StatusVariant,
  { icon: React.ComponentType<{ className?: string }>; textClass: string; iconClass: string }
> = {
  healthy: {
    icon: CheckCircle2,
    textClass: 'text-[#34D399]',
    iconClass: 'text-[#34D399]'
  },
  loading: {
    icon: Loader2,
    textClass: 'text-accent',
    iconClass: 'text-accent animate-spin'
  },
  error: {
    icon: AlertCircle,
    textClass: 'text-[#F87171]',
    iconClass: 'text-[#F87171]'
  },
  neutral: {
    icon: Info,
    textClass: 'text-muted',
    iconClass: 'text-muted'
  }
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  variant,
  label,
  detail
}) => {
  const { icon: Icon, textClass, iconClass } = VARIANT_CONFIG[variant];

  return (
    <div className="inline-flex items-center gap-2 text-sm">
      <Icon className={`w-4 h-4 shrink-0 ${iconClass}`} aria-hidden="true" />
      <span className={`font-medium ${textClass}`}>{label}</span>
      {detail && (
        <>
          <span className="text-border-strong" aria-hidden="true">
            ·
          </span>
          <span className="text-muted text-[13px]">{detail}</span>
        </>
      )}
    </div>
  );
};
